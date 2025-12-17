import pandas as pd
import json
import requests
from typing import Dict, List, Any
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CropDataConverter:
    def __init__(self, excel_file_path: str, api_url: str = "http://localhost:7070/crop/bulk-create"):
        self.excel_file_path = excel_file_path
        self.api_url = api_url

        # Enums to match your NestJS DTOs
        self.DISEASE_TYPE_ENUM = {
            "FUNGAL": "FUNGAL",
            "VIRAL": "VIRAL",
            "BACTERIAL": "BACTERIAL",
            "OTHER": "OTHER"
        }

        self.PEST_TYPE_ENUM = {
            "INSECT": "INSECT",
            "NEMATODE": "NEMATODE",
            "OTHER": "OTHER"
        }

    def read_excel_data(self) -> pd.DataFrame:
        try:
            df = pd.read_excel(self.excel_file_path)
            df.columns = df.columns.str.strip()
            logger.info(f"Successfully read Excel file with {len(df)} rows")
            return df
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            raise

    def clean_string(self, value: str, max_length: int = 500) -> str:
        if pd.isna(value) or value == "":
            return ""
        cleaned = str(value).strip()
        cleaned = re.sub(r'\n+', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length].rstrip()
        return cleaned

    def parse_multi_line_list(self, value: str) -> List[str]:
        if pd.isna(value) or value == "":
            return []
        items = []
        lines = str(value).split('\n')
        for line in lines:
            cleaned = re.sub(r'^\d+(\.\d+)*\.?\s*', '', line.strip())
            cleaned = self.clean_string(cleaned)
            if cleaned:
                items.append(cleaned)
        return items

    def parse_pesticides(self, value: str) -> List[str]:
        if pd.isna(value) or value == "":
            return []
        items = []
        lines = re.split(r'\n|•|o\s+', str(value))
        for line in lines:
            cleaned = self.clean_string(line.strip())
            if cleaned and cleaned.lower() not in ['', 'pesticides', 'fungicides']:
                items.append(cleaned)
        return items

    def parse_fertilizers(self, value: str) -> List[str]:
        if pd.isna(value) or value == "":
            return []
        items = []
        lines = str(value).split('\n')
        for line in lines:
            cleaned = re.sub(r'^\d+\.\s*', '', line.strip())
            cleaned = self.clean_string(cleaned)
            if cleaned:
                items.append(cleaned)
        return items

    def match_disease_to_fungus(self, diseases: List[str], funguses: List[str]) -> List[Dict[str, str]]:
        matched = []
        for i, disease in enumerate(diseases):
            fungus = funguses[i] if i < len(funguses) else None
            matched.append({
                "disease": disease,
                "fungus": fungus
            })
        return matched

    def detect_disease_type(self, disease_name: str) -> str:
        """Auto-detect disease type based on keywords"""
        disease_name_lower = disease_name.lower()
        if any(k in disease_name_lower for k in ['virus']):
            return self.DISEASE_TYPE_ENUM['VIRAL']
        elif any(k in disease_name_lower for k in ['bacteria', 'bacterial']):
            return self.DISEASE_TYPE_ENUM['BACTERIAL']
        elif any(k in disease_name_lower for k in ['fungus', 'fungal', 'mildew', 'rust']):
            return self.DISEASE_TYPE_ENUM['FUNGAL']
        else:
            return self.DISEASE_TYPE_ENUM['OTHER']

    def detect_pest_type(self, pest_name: str) -> str:
        """Auto-detect pest type based on keywords"""
        pest_name_lower = pest_name.lower()
        if any(k in pest_name_lower for k in ['nematode']):
            return self.PEST_TYPE_ENUM['NEMATODE']
        elif any(k in pest_name_lower for k in ['insect', 'aphid', 'beetle', 'worm', 'moth']):
            return self.PEST_TYPE_ENUM['INSECT']
        else:
            return self.PEST_TYPE_ENUM['OTHER']

    def convert_to_api_format(self, df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
        crops_dict = {}
        logger.info("Converting Excel data to API format...")

        for index, row in df.iterrows():
            try:
                crop_name = self.clean_string(row.get('Crop Type', ''), 100)
                strain_name = self.clean_string(row.get('Strain Type', ''), 100)
                seed_type = self.clean_string(row.get('Seed Type', ''), 50)

                if not crop_name or not strain_name:
                    logger.warning(f"Row {index}: Skipping incomplete row")
                    continue

                if crop_name not in crops_dict:
                    crops_dict[crop_name] = {
                        "names": [{
                            "name": crop_name,
                            "languageCode": "en",
                            "languageName": "English"
                        }],
                        "cropTypes": [],
                        "fertilizers": self.parse_fertilizers(row.get('Fertilizer', '')),
                        "diseases": [],
                        "pests": [],
                        "medicines": []
                    }

                # Handle crop types & seed strains
                crop_type_name = seed_type if seed_type else 'Standard'
                crop_type_exists = False
                for existing_type in crops_dict[crop_name]["cropTypes"]:
                    if existing_type["name"] == crop_type_name:
                        crop_type_exists = True
                        seed_strain = {
                            "name": strain_name,
                            "seedType": seed_type
                        }
                        existing_type.setdefault("seedStrains", []).append(seed_strain)
                        break

                if not crop_type_exists:
                    crop_type = {
                        "name": crop_type_name,
                        "seedStrains": [{
                            "name": strain_name,
                            "seedType": seed_type
                        }]
                    }
                    crops_dict[crop_name]["cropTypes"].append(crop_type)

                # Parse diseases & pests
                diseases = self.parse_multi_line_list(row.get('Disease', ''))
                disease_types = self.parse_multi_line_list(row.get('Types of Disease', ''))
                funguses = self.parse_multi_line_list(row.get('Fungus', ''))
                pesticides = self.parse_pesticides(row.get('Pesticides', ''))
                pests = self.parse_multi_line_list(row.get('Pests', ''))

                # Aggregate medicines
                for med in pesticides:
                    if med not in crops_dict[crop_name]["medicines"]:
                        crops_dict[crop_name]["medicines"].append(med)

                # Add diseases
                for i, disease in enumerate(diseases):
                    disease_dto = {
                        "name": disease,
                        "type": self.detect_disease_type(disease),
                        "medication": pesticides[0] if pesticides else "Not specified",
                        "specificType": disease_types[i] if i < len(disease_types) else None,
                        "causativeAgent": funguses[i] if i < len(funguses) else None
                    }
                    if not any(d["name"] == disease_dto["name"] for d in crops_dict[crop_name]["diseases"]):
                        crops_dict[crop_name]["diseases"].append(disease_dto)

                # Add pests
                for pest in pests:
                    pest_dto = {
                        "name": pest,
                        "type": self.detect_pest_type(pest),
                        "medication": pesticides[0] if pesticides else "Not specified"
                    }
                    if not any(p["name"] == pest_dto["name"] for p in crops_dict[crop_name]["pests"]):
                        crops_dict[crop_name]["pests"].append(pest_dto)

            except Exception as e:
                logger.error(f"Error processing row {index}: {str(e)}")
                continue

        # Clean empty fields
        api_crops = []
        for crop_data in crops_dict.values():
            if crop_data["diseases"]:
                crop_data["diseases"] = [{k: v for k, v in d.items() if v is not None} for d in crop_data["diseases"]]
            if crop_data["pests"]:
                crop_data["pests"] = [{k: v for k, v in p.items() if v is not None} for p in crop_data["pests"]]
            if crop_data["fertilizers"]:
                crop_data["fertilizers"] = [f for f in crop_data["fertilizers"] if f]
            if not crop_data["medicines"]:
                crop_data.pop("medicines")
            api_crops.append(crop_data)

        return {"crops": api_crops}

    def save_json(self, data: Dict[str, Any], output_file: str = "crops_converted.json"):
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {output_file}")
        except Exception as e:
            logger.error(f"Error saving JSON file: {str(e)}")
            raise

    def send_to_api(self, data: Dict[str, Any], print_response: bool = True) -> bool:
        try:
            headers = {
                'Content-Type': 'application/json',
                # Replace with actual token
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjliMjMzYWQ4LTNiMmItNDA5MC1iZWI5LTViZmIzNGIwNzA4YSIsImVtYWlsIjoidW11ZmFzaGFAZ21haWwuY29tIiwidXNlck5hbWUiOiJKb3NlcGgiLCJzdGF0dXMiOiJBQ1RJVkUiLCJyb2xlIjp7ImlkIjoiODNjMTgyZmEtOGE5YS00ZGE5LTgyOWEtMTQ2MGRkNTkyMmE4IiwiY3JlYXRlZEF0IjoiMjAyNS0xMi0wOFQwOToxMTo1MC4yNDJaIiwidXBkYXRlZEF0IjoiMjAyNS0xMi0wOFQwOToxMTo1MC4yNDJaIiwibmFtZSI6IlVNVUZBU0hBTVlVTVZJUkUifSwiaWF0IjoxNzY1ODkzODkyLCJleHAiOjE3NjYwNjY2OTJ9.q0IJEUsIPJ2eC_i9GbrkoX79gc6UaTSuX-WzNO54Xa4"
            }
            logger.info("Sending data to API...")
            response = requests.post(self.api_url, json=data, headers=headers)
            if print_response:
                print("\n" + "="*50)
                print("API RESPONSE:")
                print("="*50)
                print(f"Status Code: {response.status_code}")
                print(f"Response: {response.text[:500]}..." if len(response.text) > 500 else f"Response: {response.text}")
                print("="*50 + "\n")
            return response.status_code in [200, 201]
        except Exception as e:
            logger.error(f"Error sending data to API: {str(e)}")
            return False

    def process_and_send(self, save_json: bool = True, send_to_api: bool = True):
        try:
            df = self.read_excel_data()
            api_data = self.convert_to_api_format(df)
            logger.info(f"Converted {len(api_data['crops'])} crops for API")

            # Summary
            total_crop_types = sum(len(crop.get('cropTypes', [])) for crop in api_data['crops'])
            total_seed_strains = sum(sum(len(ct.get('seedStrains', [])) for ct in crop.get('cropTypes', [])) for crop in api_data['crops'])
            total_diseases = sum(len(crop.get('diseases', [])) for crop in api_data['crops'])
            total_pests = sum(len(crop.get('pests', [])) for crop in api_data['crops'])
            total_fertilizers = sum(len(crop.get('fertilizers', [])) for crop in api_data['crops'])

            print(f"\n📊 CONVERSION SUMMARY:")
            print(f"   Total Crops: {len(api_data['crops'])}")
            print(f"   Total Crop Types: {total_crop_types}")
            print(f"   Total Seed Strains: {total_seed_strains}")
            print(f"   Total Diseases: {total_diseases}")
            print(f"   Total Pests: {total_pests}")
            print(f"   Total Fertilizers: {total_fertilizers}")

            if api_data['crops']:
                sample = api_data['crops'][0]
                print(f"\n🔍 SAMPLE CROP: {sample['names'][0]['name']}")
                if sample.get('cropTypes'):
                    ct = sample['cropTypes'][0]
                    print(f"   Crop Type: {ct['name']}")
                    if ct.get('seedStrains'):
                        ss = ct['seedStrains'][0]
                        print(f"   Seed Strain: {ss['name']} ({ss.get('seedType', 'N/A')})")
                if sample.get('diseases'):
                    d = sample['diseases'][0]
                    print(f"\n   Sample Disease: {d['name']}")
                    print(f"   Type: {d.get('type')}")
                    if d.get('specificType'):
                        print(f"   Specific Type: {d['specificType']}")
                    if d.get('causativeAgent'):
                        print(f"   Fungus: {d['causativeAgent']}")
                    print(f"   Medication: {d['medication'][:50]}...")

            if save_json:
                self.save_json(api_data, "crops_data_ready.json")
                print(f"\n💾 JSON file saved: crops_data_ready.json")

            if send_to_api:
                user_input = input(f"\n⚠️  READY TO SEND {len(api_data['crops'])} CROPS TO DATABASE. Proceed? (y/n): ").lower().strip()
                if user_input in ['y', 'yes']:
                    success = self.send_to_api(api_data)
                    print("✅ Success!" if success else "❌ Failed")
                else:
                    print("⏸️ API call cancelled by user")
        except Exception as e:
            logger.error(f"Error in processing: {str(e)}")
            raise

def main():
    EXCEL_FILE_PATH = "crops_data.xlsx"
    API_URL = "http://localhost:7070/crop/bulk-create"
    converter = CropDataConverter(EXCEL_FILE_PATH, API_URL)
    converter.process_and_send(save_json=True, send_to_api=True)

if __name__ == "__main__":
    main()
