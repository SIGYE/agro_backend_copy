import pandas as pd
import json
import requests
from typing import Dict, List, Any
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnimalDataConverter:
    def __init__(self, excel_file_path: str, api_url: str = "https://localhost:7070/animal/bulk-create"):
        self.excel_file_path = excel_file_path
        self.api_url = api_url
        
    def read_excel_data(self) -> pd.DataFrame:
        """Read the Excel file and return DataFrame"""
        try:
            df = pd.read_excel(self.excel_file_path)
            logger.info(f"Successfully read Excel file with {len(df)} rows")
            return df
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            raise
    
    def clean_string(self, value: str, max_length: int = 500) -> str:
        """Clean string while preserving meaningful content"""
        if pd.isna(value) or value == "":
            return ""
        
        cleaned = str(value).strip()
        cleaned = re.sub(r'\n+', ' ', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length].rstrip()
            
        return cleaned
    
    def parse_comma_separated(self, value: str) -> List[str]:
        """Parse comma-separated values"""
        if pd.isna(value) or value == "":
            return []
        
        items = [self.clean_string(item.strip()) for item in str(value).split(',')]
        return [item for item in items if item]
    
    def parse_animal_products(self, value: str) -> List[Dict[str, str]]:
        """Parse animal products data"""
        if pd.isna(value) or value == "":
            return []
        
        products = []
        raw_names = self.parse_comma_separated(value)
        
        for item in raw_names:
            cleaned_name = self.clean_string(item, 200)
            if cleaned_name:
                products.append({"name": cleaned_name})
        
        return products
    
    def parse_diseases_pests(self, value: str, item_type: str) -> List[Dict[str, str]]:
        """Parse diseases or pests data for animals"""
        if pd.isna(value) or value == "":
            return []
        
        items = []
        raw_names = self.parse_comma_separated(value)
        
        for item in raw_names:
            cleaned_name = self.clean_string(item, 300)
            if cleaned_name:
                items.append({
                    "name": cleaned_name,
                    "type": item_type,  # "LIVESTOCK"
                    "medication": "Not specified"
                })
        
        return items
    
    def convert_to_api_format(self, df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
        """Convert DataFrame to API format"""
        animals_dict = {}
        
        logger.info("Converting Excel data to API format...")
        
        for index, row in df.iterrows():
            try:
                animal_name = self.clean_string(row.get('Animal Name', ''), 100)
                breed_name = self.clean_string(row.get('Breed Name', ''), 100)
                
                if not animal_name:
                    logger.warning(f"Row {index}: Skipping row with empty animal name")
                    continue
                
                if not breed_name:
                    logger.warning(f"Row {index}: Skipping row with empty breed name")
                    continue
                
                # Initialize animal if not exists
                if animal_name not in animals_dict:
                    animals_dict[animal_name] = {
                        "name": animal_name,
                        "breeds": [],
                        "animalProducts": self.parse_animal_products(row.get('Animal Products', '')),
                        "vaccines": self.parse_comma_separated(row.get('Vaccines', '')),
                        "medicines": self.parse_comma_separated(row.get('Medicines', '')),
                        "diseases": self.parse_diseases_pests(row.get('Diseases', ''), 'LIVESTOCK'),
                        "pests": self.parse_diseases_pests(row.get('Pests', ''), 'LIVESTOCK')
                    }
                
                # Add breed if not already exists
                existing_animal = animals_dict[animal_name]
                breed_exists = any(b["breedName"] == breed_name for b in existing_animal["breeds"])
                
                if not breed_exists:
                    existing_animal["breeds"].append({"breedName": breed_name})
                
                # Merge other data (add if not exists)
                self.merge_animal_data(existing_animal, row)
                    
            except Exception as e:
                logger.error(f"Error processing row {index}: {str(e)}")
                continue
        
        # Convert to final API format
        api_animals = list(animals_dict.values())
        return {"animals": api_animals}
    
    def merge_animal_data(self, existing_animal: Dict[str, Any], row: pd.Series):
        """Merge new animal data into existing animal"""
        # Merge animal products
        new_products = self.parse_animal_products(row.get('Animal Products', ''))
        for product in new_products:
            if not any(p["name"] == product["name"] for p in existing_animal["animalProducts"]):
                existing_animal["animalProducts"].append(product)
        
        # Merge vaccines
        new_vaccines = self.parse_comma_separated(row.get('Vaccines', ''))
        for vaccine in new_vaccines:
            if vaccine not in existing_animal["vaccines"]:
                existing_animal["vaccines"].append(vaccine)
        
        # Merge medicines
        new_medicines = self.parse_comma_separated(row.get('Medicines', ''))
        for medicine in new_medicines:
            if medicine not in existing_animal["medicines"]:
                existing_animal["medicines"].append(medicine)
        
        # Merge diseases
        new_diseases = self.parse_diseases_pests(row.get('Diseases', ''), 'LIVESTOCK')
        for disease in new_diseases:
            if not any(d["name"] == disease["name"] for d in existing_animal["diseases"]):
                existing_animal["diseases"].append(disease)
        
        # Merge pests
        new_pests = self.parse_diseases_pests(row.get('Pests', ''), 'LIVESTOCK')
        for pest in new_pests:
            if not any(p["name"] == pest["name"] for p in existing_animal["pests"]):
                existing_animal["pests"].append(pest)
    
    def save_json(self, data: Dict[str, Any], output_file: str = "animals_converted.json"):
        """Save data to JSON file for inspection"""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {output_file}")
        except Exception as e:
            logger.error(f"Error saving JSON file: {str(e)}")
            raise
    
    def send_to_api(self, data: Dict[str, Any], print_response: bool = True) -> bool:
        """Send data to the API"""
        try:
            headers = {
                'Content-Type': 'application/json',
                "Authorization": f"Bearer YOUR_TOKEN_HERE"  # Replace with actual token
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
            
            if response.status_code in [200, 201]:
                logger.info("Data successfully sent to API")
                return True
            else:
                logger.error(f"Failed to send data: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending data to API: {str(e)}")
            return False
    
    def process_and_send(self, save_json: bool = True, send_to_api: bool = True):
        """Main method to process Excel file and send to API"""
        try:
            # Read Excel data
            df = self.read_excel_data()
            
            # Convert to API format
            api_data = self.convert_to_api_format(df)
            
            logger.info(f"Converted {len(api_data['animals'])} animals for API")
            
            # Print summary
            total_breeds = sum(len(animal.get('breeds', [])) for animal in api_data['animals'])
            total_products = sum(len(animal.get('animalProducts', [])) for animal in api_data['animals'])
            total_vaccines = sum(len(animal.get('vaccines', [])) for animal in api_data['animals'])
            total_medicines = sum(len(animal.get('medicines', [])) for animal in api_data['animals'])
            total_diseases = sum(len(animal.get('diseases', [])) for animal in api_data['animals'])
            total_pests = sum(len(animal.get('pests', [])) for animal in api_data['animals'])
            
            print(f"\n📊 CONVERSION SUMMARY:")
            print(f"   Total Animals: {len(api_data['animals'])}")
            print(f"   Total Breeds: {total_breeds}")
            print(f"   Total Products: {total_products}")
            print(f"   Total Vaccines: {total_vaccines}")
            print(f"   Total Medicines: {total_medicines}")
            print(f"   Total Diseases: {total_diseases}")
            print(f"   Total Pests: {total_pests}")
            
            # Show sample data
            if api_data['animals']:
                sample = api_data['animals'][0]
                print(f"\n🔍 SAMPLE ANIMAL: {sample['name']}")
                
                if sample.get('breeds'):
                    print(f"   Breeds: {', '.join([b['breedName'] for b in sample['breeds'][:3]])}")
                
                if sample.get('vaccines'):
                    print(f"   Sample Vaccine: {sample['vaccines'][0][:50]}...")
            
            # Save to JSON file for inspection
            if save_json:
                self.save_json(api_data, "animals_data_ready.json")
                print(f"\n💾 JSON file saved: animals_data_ready.json")
            
            # Ask for confirmation before sending
            if send_to_api:
                print(f"\n⚠️  READY TO SEND {len(api_data['animals'])} ANIMALS TO DATABASE")
                user_input = input("Proceed with sending to API? (y/n): ").lower().strip()
                
                if user_input in ['y', 'yes']:
                    success = self.send_to_api(api_data)
                    if success:
                        print("✅ Data successfully sent to database!")
                    else:
                        print("❌ Failed to send data to database")
                else:
                    print("⏸️  API call cancelled by user")
            
        except Exception as e:
            logger.error(f"Error in processing: {str(e)}")
            raise

def main():
    # Configuration
    EXCEL_FILE_PATH = "animals_data.xlsx"  # Your Excel file path
    API_URL = "https://localhost:7070/animal/bulk-create"  # Your API endpoint
    
    # Create converter instance
    converter = AnimalDataConverter(EXCEL_FILE_PATH, API_URL)
    
    # Process the data
    # Set send_to_api=False to just generate JSON file first
    converter.process_and_send(save_json=True, send_to_api=True)

if __name__ == "__main__":
    main()