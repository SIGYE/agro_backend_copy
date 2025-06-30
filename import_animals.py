import pandas as pd
import json
import requests
from typing import Dict, List, Any
import logging
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnimalDataConverter:
    def __init__(self, excel_file_path: str, api_url: str = "http://localhost:7070/animal/bulk-create"):
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
            # (e.g., "Ivermectin 1%", "Injectable" should become "Ivermectin 1% Injectable")
            if (current_item and 
                len(cleaned_item) <= 15 and 
                not any(char in cleaned_item.lower() for char in ['(', ')', '%']) and
                cleaned_item.lower() in ['injectable', 'oral', 'topical', 'powder', 'solution', 'tablets', 'capsules']):
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
    
    def parse_single_breed(self, value: str) -> Dict[str, str]:
        """Parse single breed data preserving all content"""
        if pd.isna(value) or value == "":
            return None
        
        cleaned_name = self.clean_string_preserve_content(str(value).strip(), 200)
        
        if cleaned_name:  # Include all non-empty names
            return {
                "breedName": cleaned_name
            }
        
        return None
    
    def parse_animal_products_preserve_content(self, value: str) -> List[Dict[str, str]]:
        """Parse animal products data preserving all content"""
        if pd.isna(value) or value == "":
            return []
        
        products = []
        raw_names = str(value).split(',')
        
        for item in raw_names:
            cleaned_name = self.clean_string_preserve_content(item.strip(), 200)
            
            if cleaned_name:  # Include all non-empty names
                products.append({
                    "name": cleaned_name
                })
        
        return products
    
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
                    "type": item_type,  # "LIVESTOCK" or "CROP"
                    "medication": "Not specified"
                })
        
        return items
    
    def smart_combine_fragments(self, items: List[str]) -> List[str]:
        """Intelligently combine fragmented medicine/vaccine names"""
        if not items:
            return []
        
        combined = []
        current_combination = ""
        
        for i, item in enumerate(items):
            item = item.strip()
            
            # Indicators that this might be a fragment that should be combined
            is_likely_fragment = (
                len(item) <= 15 and
                (item.lower() in ['injectable', 'oral', 'topical', 'powder', 'solution', 'tablets', 'capsules', 'vaccine', 'antiserum'] or
                 re.match(r'^\d+%?$', item) or  # Just numbers or percentages
                 item in ['(IM)', '(IV)', '(SC)', 'ml', 'mg', 'IU'] or
                 re.match(r'^\([^)]+\)$', item))  # Just something in parentheses
            )
            
            # Check if the previous item ended in a way that suggests continuation
            prev_suggests_continuation = (
                current_combination and 
                (current_combination.endswith('%') or 
                 current_combination.endswith('mg') or
                 current_combination.endswith('ml') or
                 'vaccine' in current_combination.lower())
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
            cleaned = re.sub(r'\s*\(\s*', ' (', item)
            cleaned = re.sub(r'\s*\)\s*', ') ', cleaned)
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
            
            if cleaned:
                final_combined.append(cleaned)
        
        return final_combined
    
    def validate_animal_data_preserve_content(self, animal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean animal data while preserving all meaningful content"""
        # Clean animal name
        animal_data["name"] = self.clean_string_preserve_content(animal_data["name"], 100)
        
        # Handle breeds
        if animal_data.get("breeds"):
            validated_breeds = []
            for breed in animal_data["breeds"]:
                cleaned_breed_name = self.clean_string_preserve_content(breed["breedName"], 200)
                if cleaned_breed_name:  # Keep all non-empty names
                    validated_breeds.append({"breedName": cleaned_breed_name})
            animal_data["breeds"] = validated_breeds
        
        # Handle animal products
        if animal_data.get("animalProducts"):
            validated_products = []
            for product in animal_data["animalProducts"]:
                cleaned_product_name = self.clean_string_preserve_content(product["name"], 200)
                if cleaned_product_name:  # Keep all non-empty names
                    validated_products.append({"name": cleaned_product_name})
            animal_data["animalProducts"] = validated_products
        
        # Smart combine vaccines
        raw_vaccines = animal_data.get("vaccines", [])
        animal_data["vaccines"] = self.smart_combine_fragments(raw_vaccines)
        
        # Smart combine medicines  
        raw_medicines = animal_data.get("medicines", [])
        animal_data["medicines"] = self.smart_combine_fragments(raw_medicines)
        
        # Diseases and pests are already properly handled
        
        return animal_data
    
    def convert_to_api_format(self, df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
        """Convert DataFrame to API format preserving all content - Each row represents one breed"""
        animals_dict = {}
        
        logger.info("Converting Excel data to API format (each row = one breed)...")
        
        for index, row in df.iterrows():
            try:
                animal_name = self.clean_string_preserve_content(row.get('Animal Name', ''), 100)
                
                if not animal_name:
                    logger.warning(f"Row {index}: Skipping row with empty animal name")
                    continue
                
                # Parse single breed for this row
                breed = self.parse_single_breed(row.get('Breed Name', ''))
                
                # Initialize animal if not exists
                if animal_name not in animals_dict:
                    animals_dict[animal_name] = {
                        "name": animal_name,
                        "breeds": [],
                        "animalProducts": self.parse_animal_products_preserve_content(
                            row.get('Animal Products', '')
                        ),
                        "vaccines": self.parse_comma_separated_values_preserve_all(
                            row.get('Vaccines', '')
                        ),
                        "medicines": self.parse_comma_separated_values_preserve_all(
                            row.get('Medicines', '')
                        ),
                        "diseases": self.parse_diseases_pests_preserve_content(
                            row.get('Diseases', ''), 'LIVESTOCK'
                        ),
                        "pests": self.parse_diseases_pests_preserve_content(
                            row.get('Pests', ''), 'LIVESTOCK'
                        )
                    }
                
                # Always access the existing animal for merging
                existing_animal = animals_dict[animal_name]
                
                # Add breed if it exists and is not already added
                if breed and not any(b["breedName"] == breed["breedName"] for b in existing_animal["breeds"]):
                    existing_animal["breeds"].append(breed)
                
                # Merge animal products (only add new ones)
                new_products = self.parse_animal_products_preserve_content(row.get('Animal Products', ''))
                for product in new_products:
                    if not any(p["name"] == product["name"] for p in existing_animal["animalProducts"]):
                        existing_animal["animalProducts"].append(product)
                
                # Merge vaccines (only add new ones)
                new_vaccines = self.parse_comma_separated_values_preserve_all(row.get('Vaccines', ''))
                for vaccine in new_vaccines:
                    if vaccine not in existing_animal["vaccines"]:
                        existing_animal["vaccines"].append(vaccine)
                
                # Merge medicines (only add new ones)
                new_medicines = self.parse_comma_separated_values_preserve_all(row.get('Medicines', ''))
                for medicine in new_medicines:
                    if medicine not in existing_animal["medicines"]:
                        existing_animal["medicines"].append(medicine)
                
                # Merge diseases (only add new ones)
                new_diseases = self.parse_diseases_pests_preserve_content(row.get('Diseases', ''), 'LIVESTOCK')
                for disease in new_diseases:
                    if not any(d["name"] == disease["name"] for d in existing_animal["diseases"]):
                        existing_animal["diseases"].append(disease)
                
                # Merge pests (only add new ones)
                new_pests = self.parse_diseases_pests_preserve_content(row.get('Pests', ''), 'LIVESTOCK')
                for pest in new_pests:
                    if not any(p["name"] == pest["name"] for p in existing_animal["pests"]):
                        existing_animal["pests"].append(pest)
                    
            except Exception as e:
                logger.error(f"Error processing row {index}: {str(e)}")
                continue
        
        # Validate and clean all animal data while preserving content
        validated_animals = []
        for animal_data in animals_dict.values():
            try:
                validated_animal = self.validate_animal_data_preserve_content(animal_data)
                if validated_animal["name"]:
                    validated_animals.append(validated_animal)
            except Exception as e:
                logger.error(f"Error validating animal {animal_data.get('name', 'Unknown')}: {str(e)}")
        
        # Convert to API format
        api_data = {
            "animals": validated_animals
        }
        
        logger.info(f"Successfully converted {len(validated_animals)} animals")
        return api_data
    
    def save_json(self, data: Dict[str, Any], output_file: str = "animals_data.json"):
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
            
            logger.info(f"Converted {len(api_data['animals'])} animals for API")
            
            # Print summary statistics
            total_breeds = sum(len(animal.get('breeds', [])) for animal in api_data['animals'])
            total_products = sum(len(animal.get('animalProducts', [])) for animal in api_data['animals'])
            total_vaccines = sum(len(animal.get('vaccines', [])) for animal in api_data['animals'])
            total_medicines = sum(len(animal.get('medicines', [])) for animal in api_data['animals'])
            total_diseases = sum(len(animal.get('diseases', [])) for animal in api_data['animals'])
            total_pests = sum(len(animal.get('pests', [])) for animal in api_data['animals'])
            
            print(f"\n📊 LIVESTOCK CONVERSION SUMMARY:")
            print(f"   Animals: {len(api_data['animals'])}")
            print(f"   Total Breeds: {total_breeds}")
            print(f"   Total Products: {total_products}")
            print(f"   Total Vaccines: {total_vaccines}")
            print(f"   Total Medicines: {total_medicines}")
            print(f"   Total Diseases: {total_diseases}")
            print(f"   Total Pests: {total_pests}")
            
            # Show some examples of what was preserved
            if api_data['animals']:
                sample_animal = api_data['animals'][0]
                print(f"\n🔍 SAMPLE LIVESTOCK: {sample_animal['name']}")
                
                if sample_animal.get('breeds'):
                    print(f"\n   BREEDS:")
                    for i, breed in enumerate(sample_animal['breeds'][:3]):
                        print(f"   {i+1}. {breed['breedName']}")
                
                if sample_animal.get('vaccines'):
                    print(f"\n   VACCINES (showing preserved content):")
                    for i, vaccine in enumerate(sample_animal['vaccines'][:3]):
                        print(f"   {i+1}. {vaccine}")
                
                if sample_animal.get('medicines'):
                    print(f"\n   MEDICINES:")
                    for i, med in enumerate(sample_animal['medicines'][:3]):
                        print(f"   {i+1}. {med}")
                
                if sample_animal.get('animalProducts'):
                    print(f"\n   PRODUCTS:")
                    for i, product in enumerate(sample_animal['animalProducts'][:3]):
                        print(f"   {i+1}. {product['name']}")
            
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

def create_sample_excel():
    """Create a sample Excel file for testing - Each row represents one breed"""
    sample_data = {
        'Animal Name': [
            'Cattle', 'Cattle', 'Cattle', 'Cattle',
            'Poultry', 'Poultry', 'Poultry',
            'Goats', 'Goats', 'Goats',
            'Pigs', 'Pigs', 'Pigs'
        ],
        'Breed Name': [
            'Holstein', 'Angus', 'Hereford', 'Jersey',
            'Broiler', 'Layer', 'Rhode Island Red',
            'Boer', 'Nubian', 'Saanen',
            'Yorkshire', 'Landrace', 'Hampshire'
        ],
        'Animal Products': [
            'Milk, Meat, Leather, Manure', 'Milk, Meat, Leather, Manure', 'Milk, Meat, Leather, Manure', 'Milk, Cheese',
            'Eggs, Meat, Feathers', 'Eggs, Meat, Feathers', 'Eggs, Meat, Feathers',
            'Milk, Meat, Skin, Manure', 'Milk, Meat, Skin, Manure', 'Milk, Meat, Skin, Manure',
            'Meat, Bacon, Lard', 'Meat, Bacon, Lard', 'Meat, Bacon, Lard'
        ],
        'Vaccines': [
            'Foot and Mouth Disease Vaccine, Brucellosis Vaccine, Blackleg Vaccine', 'Foot and Mouth Disease Vaccine, Brucellosis Vaccine, Blackleg Vaccine', 'Foot and Mouth Disease Vaccine, Brucellosis Vaccine, Blackleg Vaccine', 'Anthrax Vaccine, Clostridial Vaccine',
            'Newcastle Disease Vaccine, Infectious Bronchitis Vaccine, Marek Disease Vaccine', 'Newcastle Disease Vaccine, Infectious Bronchitis Vaccine, Marek Disease Vaccine', 'Newcastle Disease Vaccine, Infectious Bronchitis Vaccine, Marek Disease Vaccine',
            'Peste des Petits Ruminants Vaccine, Contagious Caprine Pleuropneumonia Vaccine', 'Peste des Petits Ruminants Vaccine, Contagious Caprine Pleuropneumonia Vaccine', 'Peste des Petits Ruminants Vaccine, Contagious Caprine Pleuropneumonia Vaccine',
            'Classical Swine Fever Vaccine, Porcine Parvovirus Vaccine', 'Classical Swine Fever Vaccine, Porcine Parvovirus Vaccine', 'Classical Swine Fever Vaccine, Porcine Parvovirus Vaccine'
        ],
        'Medicines': [
            'Penicillin, Oxytetracycline, Ivermectin, Albendazole', 'Penicillin, Oxytetracycline, Ivermectin, Albendazole', 'Penicillin, Oxytetracycline, Ivermectin, Albendazole', 'Tylosin, Florfenicol',
            'Enrofloxacin, Doxycycline, Amprolium', 'Enrofloxacin, Doxycycline, Amprolium', 'Enrofloxacin, Doxycycline, Amprolium',
            'Sulfadimethoxine, Levamisole, Fenbendazole', 'Sulfadimethoxine, Levamisole, Fenbendazole', 'Sulfadimethoxine, Levamisole, Fenbendazole',
            'Lincomycin, Tiamulin, Carbadox', 'Lincomycin, Tiamulin, Carbadox', 'Lincomycin, Tiamulin, Carbadox'
        ],
        'Diseases': [
            'Foot and Mouth Disease, Mastitis, Pneumonia, Diarrhea', 'Foot and Mouth Disease, Mastitis, Pneumonia, Diarrhea', 'Foot and Mouth Disease, Mastitis, Pneumonia, Diarrhea', 'Milk Fever, Ketosis',
            'Newcastle Disease, Coccidiosis, Infectious Bronchitis', 'Newcastle Disease, Coccidiosis, Infectious Bronchitis', 'Newcastle Disease, Coccidiosis, Infectious Bronchitis',
            'Pneumonia, Enterotoxemia, Parasitic infections', 'Pneumonia, Enterotoxemia, Parasitic infections', 'Pneumonia, Enterotoxemia, Parasitic infections',
            'Swine Flu, Diarrhea, Respiratory infections', 'Swine Flu, Diarrhea, Respiratory infections', 'Swine Flu, Diarrhea, Respiratory infections'
        ],
        'Pests': [
            'Cattle Tick, Horn Fly, Face Fly, Stable Fly', 'Cattle Tick, Horn Fly, Face Fly, Stable Fly', 'Cattle Tick, Horn Fly, Face Fly, Stable Fly', 'Lice, Mites',
            'Red Mite, Northern Fowl Mite, Lice', 'Red Mite, Northern Fowl Mite, Lice', 'Red Mite, Northern Fowl Mite, Lice',
            'Lice, Mites, Keds', 'Lice, Mites, Keds', 'Lice, Mites, Keds',
            'Lice, Mites, Mange', 'Lice, Mites, Mange', 'Lice, Mites, Mange'
        ]
    }
    
    df = pd.DataFrame(sample_data)
    df.to_excel('sample_animals_data.xlsx', index=False)
    print("Sample Excel file 'sample_animals_data.xlsx' created successfully!")
    print("\nSample format - Each row represents one breed:")
    print("Animal Name | Breed Name | Animal Products | Vaccines | Medicines | Diseases | Pests")
    print("Cattle      | Holstein   | Milk, Meat...   | FMD...   | Penicil... | FMD...  | Tick...")
    print("Cattle      | Angus      | Milk, Meat...   | FMD...   | Penicil... | FMD...  | Tick...")
    return 'sample_animals_data.xlsx'

def main():
    # Configuration
    EXCEL_FILE_PATH = "animals.xlsx"  # Update this path
    API_URL = "https://endpoints.agro.rw/animal/bulk-create"
    
    # Check if file exists, if not create sample
    import os
    if not os.path.exists(EXCEL_FILE_PATH):
        print(f"Excel file '{EXCEL_FILE_PATH}' not found.")
        create_sample = input("Would you like to create a sample Excel file? (y/n): ").lower().strip()
        if create_sample in ['y', 'yes']:
            EXCEL_FILE_PATH = create_sample_excel()
        else:
            print("Please provide a valid Excel file path.")
            return
    
    # Create converter instance
    converter = AnimalDataConverter(EXCEL_FILE_PATH, API_URL)
    
    # Process the data
    # Set print_data_before_send=True to see the data before sending
    # Set send_to_api=False if you want to just generate the JSON file first
    converter.process_and_send(save_json_file=True, send_to_api=True, print_data_before_send=True)

if __name__ == "__main__":
    main()