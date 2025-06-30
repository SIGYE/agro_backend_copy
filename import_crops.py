import pandas as pd
import json
import requests
from typing import Dict, List, Any
import logging
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CropDataConverter:
    def __init__(self, excel_file_path: str, api_url: str = "http://localhost:7070/crop/bulk-create"):
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
    
    def clean_string_preserve_content(self, value: str, max_length: int = 500) -> str:
        """Clean string while preserving all meaningful content including special characters"""
        if pd.isna(value) or value == "":
            return ""
        
        # Convert to string and clean
        cleaned = str(value).strip()
        
        # Replace newlines with spaces but preserve the content
        cleaned = re.sub(r'\n+', ' ', cleaned)
        
        # Replace multiple spaces with single space
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Don't remove special characters like %, (, ), +, -, etc. as they're meaningful
        # Just ensure we don't have leading/trailing spaces
        cleaned = cleaned.strip()
        
        # Only truncate if extremely long (very generous limit)
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length].rstrip()
            logger.warning(f"Truncated extremely long string: {cleaned[:50]}...")
        
        return cleaned
    
    def parse_comma_separated_values_preserve_all(self, value: str) -> List[str]:
        """Parse comma-separated values preserving ALL content including short names and special chars"""
        if pd.isna(value) or value == "":
            return []
        
        items = []
        raw_items = str(value).split(',')
        
        # Handle cases where items might be split across multiple parts
        current_item = ""
        
        for item in raw_items:
            cleaned_item = self.clean_string_preserve_content(item.strip())
            
            if not cleaned_item:
                continue
            
            # Check if this looks like a continuation of the previous item
            # (e.g., "Malathion 2% w/w", "Dust" should become "Malathion 2% w/w Dust")
            if (current_item and 
                len(cleaned_item) <= 10 and 
                not any(char in cleaned_item.lower() for char in ['(', ')', '%']) and
                cleaned_item.lower() in ['dust', 'ec', 'pp', 'w/w', 'pills', 'tablets', 'plates']):
                # This looks like a continuation/modifier of the previous item
                current_item = f"{current_item} {cleaned_item}"
            else:
                # This is a new item
                if current_item:
                    items.append(current_item)
                current_item = cleaned_item
        
        # Don't forget the last item
        if current_item:
            items.append(current_item)
        
        # Clean up any remaining issues
        final_items = []
        for item in items:
            # Handle percentage signs and special characters properly
            item = re.sub(r'\s+', ' ', item).strip()
            
            # Only add non-empty items
            if item:
                final_items.append(item)
        
        return final_items
    
    def parse_diseases_pests_preserve_content(self, value: str, item_type: str) -> List[Dict[str, str]]:
        """Parse diseases or pests data preserving all content"""
        if pd.isna(value) or value == "":
            return []
        
        items = []
        raw_names = str(value).split(',')
        
        for item in raw_names:
            cleaned_name = self.clean_string_preserve_content(item.strip(), 300)
            
            if cleaned_name:  # Include all non-empty names
                items.append({
                    "name": cleaned_name,
                    "type": item_type,
                    "medication": "Not specified"
                })
        
        return items
    
    def smart_combine_fragments(self, items: List[str]) -> List[str]:
        """Intelligently combine fragmented medicine/fertilizer names"""
        if not items:
            return []
        
        combined = []
        current_combination = ""
        
        for i, item in enumerate(items):
            item = item.strip()
            
            # Indicators that this might be a fragment that should be combined
            is_likely_fragment = (
                len(item) <= 15 and
                (item.lower() in ['ec', 'dust', 'pp', 'w/w', 'pills', 'tablets', 'plates', 'fumigation'] or
                 re.match(r'^\d+%?$', item) or  # Just numbers or percentages
                 item in ['(PH3)', '56%', '57%'] or
                 re.match(r'^\([^)]+\)$', item))  # Just something in parentheses
            )
            
            # Check if the previous item ended in a way that suggests continuation
            prev_suggests_continuation = (
                current_combination and 
                (current_combination.endswith('+') or 
                 current_combination.endswith('w/w') or
                 current_combination.endswith('%') or
                 'phosphide' in current_combination.lower())
            )
            
            if is_likely_fragment or prev_suggests_continuation:
                if current_combination:
                    current_combination = f"{current_combination} {item}"
                else:
                    current_combination = item
            else:
                # This is a complete item
                if current_combination:
                    combined.append(current_combination)
                current_combination = item
        
        # Don't forget the last combination
        if current_combination:
            combined.append(current_combination)
        
        # Final cleanup
        final_combined = []
        for item in combined:
            # Clean up spacing around special characters
            cleaned = re.sub(r'\s*\+\s*', ' + ', item)
            cleaned = re.sub(r'\s*\(\s*', ' (', cleaned)
            cleaned = re.sub(r'\s*\)\s*', ') ', cleaned)
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            
            if cleaned:
                final_combined.append(cleaned)
        
        return final_combined
    
    def validate_crop_data_preserve_content(self, crop_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean crop data while preserving all meaningful content"""
        # Clean crop name
        crop_data["name"] = self.clean_string_preserve_content(crop_data["name"], 100)
        
        # Handle crop types
        if crop_data.get("cropTypes"):
            validated_crop_types = []
            for crop_type in crop_data["cropTypes"]:
                cleaned_type_name = self.clean_string_preserve_content(crop_type["name"], 100)
                if cleaned_type_name:  # Keep all non-empty names
                    validated_seed_strains = []
                    for strain in crop_type.get("seedStrains", []):
                        cleaned_strain_name = self.clean_string_preserve_content(strain["name"], 100)
                        if cleaned_strain_name:
                            validated_seed_strains.append({"name": cleaned_strain_name})
                    
                    validated_crop_types.append({
                        "name": cleaned_type_name,
                        "seedStrains": validated_seed_strains
                    })
            crop_data["cropTypes"] = validated_crop_types
        
        # Smart combine fertilizers
        raw_fertilizers = crop_data.get("fertilizers", [])
        crop_data["fertilizers"] = self.smart_combine_fragments(raw_fertilizers)
        
        # Smart combine medicines  
        raw_medicines = crop_data.get("medicines", [])
        crop_data["medicines"] = self.smart_combine_fragments(raw_medicines)
        
        # Diseases and pests are already properly handled
        
        return crop_data
    
    def convert_to_api_format(self, df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
        """Convert DataFrame to API format preserving all content"""
        crops_dict = {}
        
        logger.info("Converting Excel data to API format (preserving all content)...")
        
        for index, row in df.iterrows():
            try:
                crop_name = self.clean_string_preserve_content(row.get('Crop Name', ''), 100)
                crop_type_name = self.clean_string_preserve_content(row.get('CropType Name', ''), 100)
                
                if not crop_name:
                    logger.warning(f"Row {index}: Skipping row with empty crop name")
                    continue
                
                if not crop_type_name:
                    logger.warning(f"Row {index}: Skipping row with empty crop type name")
                    continue
                
                # Initialize crop if not exists
                if crop_name not in crops_dict:
                    crops_dict[crop_name] = {
                        "name": crop_name,
                        "cropTypes": [],
                        "fertilizers": self.parse_comma_separated_values_preserve_all(
                            row.get('Crop Fertilizers', '')
                        ),
                        "diseases": self.parse_diseases_pests_preserve_content(
                            row.get('Crop Diseases', ''), 'CROP'
                        ),
                        "pests": self.parse_diseases_pests_preserve_content(
                            row.get('Crop Pests', ''), 'CROP'
                        ),
                        "medicines": self.parse_comma_separated_values_preserve_all(
                            row.get('Crop pesticides', '')
                        )
                    }
                
                # Handle crop types and seed strains
                crop_type_exists = False
                for existing_type in crops_dict[crop_name]["cropTypes"]:
                    if existing_type["name"] == crop_type_name:
                        crop_type_exists = True
                        # Add seed strains to existing crop type
                        seed_strains = self.parse_comma_separated_values_preserve_all(
                            row.get('SeedStrain Names', '')
                        )
                        for strain in seed_strains:
                            if not any(s["name"] == strain for s in existing_type["seedStrains"]):
                                existing_type["seedStrains"].append({"name": strain})
                        break
                
                if not crop_type_exists:
                    # Create new crop type
                    seed_strains = self.parse_comma_separated_values_preserve_all(
                        row.get('SeedStrain Names', '')
                    )
                    crop_type = {
                        "name": crop_type_name,
                        "seedStrains": [{"name": strain} for strain in seed_strains]
                    }
                    crops_dict[crop_name]["cropTypes"].append(crop_type)
                    
            except Exception as e:
                logger.error(f"Error processing row {index}: {str(e)}")
                continue
        
        # Validate and clean all crop data while preserving content
        validated_crops = []
        for crop_data in crops_dict.values():
            try:
                validated_crop = self.validate_crop_data_preserve_content(crop_data)
                if validated_crop["name"]:
                    validated_crops.append(validated_crop)
            except Exception as e:
                logger.error(f"Error validating crop {crop_data.get('name', 'Unknown')}: {str(e)}")
        
        # Convert to API format
        api_data = {
            "crops": validated_crops
        }
        
        logger.info(f"Successfully converted {len(validated_crops)} crops")
        return api_data
    
    def save_json(self, data: Dict[str, Any], output_file: str = "crops_data.json"):
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
                "Authorization": f"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY0NTRmZDExLWFlOWQtNDY0Yi1iZTcyLWIzODBhNjM2MTVkZCIsImVtYWlsIjoiaG9ub3JlcnVrdW5kbzc0QGdtYWlsLmNvbSIsInVzZXJOYW1lIjoiUnVrdW5kbyIsInN0YXR1cyI6IkFDVElWRSIsInJvbGUiOnsiaWQiOiJjY2U1YzljNS02ODRmLTQyOTMtYTRiZC0xOTgxMjUzMTBlODQiLCJjcmVhdGVkQXQiOiIyMDI1LTAzLTIwVDEwOjI5OjI0LjMzM1oiLCJ1cGRhdGVkQXQiOiIyMDI1LTAzLTIwVDEwOjI5OjI0LjMzM1oiLCJuYW1lIjoiQURNSU4ifSwiaWF0IjoxNzUxMDE4NzM2LCJleHAiOjE3NTExOTE1MzZ9.9RI3A7LvmtqWZK_Vw3NX7a-fEsj11b0egrOhalK0Xbg"
            }
            
            logger.info("Sending data to API...")
            response = requests.post(self.api_url, json=data, headers=headers)
            
            if print_response:
                print("\n" + "="*50)
                print("API RESPONSE:")
                print("="*50)
                print(f"Status Code: {response.status_code}")
                print(f"Response Headers: {dict(response.headers)}")
                print(f"Response Body: {response.text}")
                print("="*50 + "\n")
            
            if response.status_code == 200 or response.status_code == 201:
                logger.info("Data successfully sent to API")
                return True
            else:
                logger.error(f"API request failed with status code: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending data to API: {str(e)}")
            return False
    
    def process_and_send(self, save_json_file: bool = True, send_to_api: bool = True, print_data_before_send: bool = True):
        """Main method to process Excel file and send to API"""
        try:
            # Read Excel data
            df = self.read_excel_data()
            
            # Convert to API format
            api_data = self.convert_to_api_format(df)
            
            logger.info(f"Converted {len(api_data['crops'])} crops for API")
            
            # Print summary statistics
            total_fertilizers = sum(len(crop.get('fertilizers', [])) for crop in api_data['crops'])
            total_diseases = sum(len(crop.get('diseases', [])) for crop in api_data['crops'])
            total_pests = sum(len(crop.get('pests', [])) for crop in api_data['crops'])
            total_medicines = sum(len(crop.get('medicines', [])) for crop in api_data['crops'])
            
            print(f"\n📊 CONVERSION SUMMARY:")
            print(f"   Crops: {len(api_data['crops'])}")
            print(f"   Total Fertilizers: {total_fertilizers}")
            print(f"   Total Diseases: {total_diseases}")
            print(f"   Total Pests: {total_pests}")
            print(f"   Total Medicines: {total_medicines}")
            
            # Show some examples of what was preserved
            if api_data['crops']:
                sample_crop = api_data['crops'][0]
                if sample_crop.get('medicines'):
                    print(f"\n🔍 SAMPLE MEDICINES (showing preserved content):")
                    for i, med in enumerate(sample_crop['medicines'][:3]):
                        print(f"   {i+1}. {med}")
                
                if sample_crop.get('fertilizers'):
                    print(f"\n🔍 SAMPLE FERTILIZERS:")
                    for i, fert in enumerate(sample_crop['fertilizers'][:3]):
                        print(f"   {i+1}. {fert}")
            
            # Print data before sending (optional)
            if print_data_before_send:
                print("\n" + "="*60)
                print("DATA TO BE SENT TO API:")
                print("="*60)
                print(json.dumps(api_data, indent=2, ensure_ascii=False))
                print("="*60 + "\n")
                
                # Ask for confirmation before sending
                if send_to_api:
                    user_input = input("Do you want to proceed with sending this data to the API? (y/n): ").lower().strip()
                    if user_input not in ['y', 'yes']:
                        logger.info("API submission cancelled by user.")
                        send_to_api = False
            
            # Save to JSON file for inspection
            if save_json_file:
                self.save_json(api_data)
            
            # Send to API
            if send_to_api:
                success = self.send_to_api(api_data)
                if success:
                    logger.info("Process completed successfully!")
                else:
                    logger.error("Failed to send data to API")
            else:
                logger.info("Data conversion completed. Skipped API call.")
                
        except Exception as e:
            logger.error(f"Error in processing: {str(e)}")
            raise

def main():
    # Configuration
    EXCEL_FILE_PATH = "test_2_agro.xlsx"  # Update this path
    API_URL = "https://endpoints.agro.rw/crop/bulk-create"
    
    # Create converter instance
    converter = CropDataConverter(EXCEL_FILE_PATH, API_URL)
    
    # Process the data
    # Set print_data_before_send=True to see the data before sending
    # Set send_to_api=False if you want to just generate the JSON file first
    converter.process_and_send(save_json_file=True, send_to_api=True, print_data_before_send=True)

if __name__ == "__main__":
    main()