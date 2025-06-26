import pandas as pd
import requests
import json
import time
from datetime import datetime
import os

class RwandaNIDExtractor:
    def __init__(self):
        self.api_url = "https://nid.moh.gov.rw/Citizen"
        self.session = requests.Session()
        
    def extract_nid_from_excel(self, excel_file_path, column_name='National ID'):
        """
        Extract National IDs from Excel file
        
        Args:
            excel_file_path (str): Path to the Excel file
            column_name (str): Name of the column containing National IDs
            
        Returns:
            list: List of National IDs
        """
        try:
            df = pd.read_excel(excel_file_path)
            
            # Check if the specified column exists
            if column_name not in df.columns:
                print(f"Column '{column_name}' not found. Available columns: {list(df.columns)}")
                return []
            
            # Extract National IDs and remove any NaN values
            nids = df[column_name].dropna().tolist()
            
            # Convert to string and remove any whitespace
            nids = [str(nid).strip() for nid in nids if str(nid).strip()]
            
            print(f"Extracted {len(nids)} National IDs from Excel file")
            return nids
            
        except Exception as e:
            print(f"Error reading Excel file: {str(e)}")
            return []
    
    def get_citizen_details(self, document_number, secret_key):
        """
        Retrieve citizen details from Rwanda NID API
        
        Args:
            document_number (str): National ID number
            secret_key (str): Secret key for API authentication
            
        Returns:
            dict: Citizen details or None if failed
        """
        try:
            payload = {
                "documentNumber": document_number,
                "secretKey": secret_key
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = self.session.post(
                self.api_url,
                data=json.dumps(payload),
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == '0':  # Assuming '0' means success
                    return data
                else:
                    print(f"API returned error status for ID {document_number}")
                    return None
            else:
                print(f"HTTP Error {response.status_code} for ID {document_number}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed for ID {document_number}: {str(e)}")
            return None
        except json.JSONDecodeError:
            print(f"Invalid JSON response for ID {document_number}")
            return None
        except Exception as e:
            print(f"Unexpected error for ID {document_number}: {str(e)}")
            return None
    
    def format_citizen_data(self, citizen_data):
        """
        Format citizen data for Excel export
        
        Args:
            citizen_data (dict): Raw citizen data from API
            
        Returns:
            dict: Formatted data for Excel
        """
        return {
            'National ID': citizen_data.get('documentNumber', ''),
            'First Name': citizen_data.get('surnames', ''),  # surnames as First Name
            'Last Name': citizen_data.get('foreName', '')
        }
    
    def process_nids_batch(self, nids, secret_key, batch_size=5, delay=2):
        """
        Process National IDs in batches with rate limiting
        
        Args:
            nids (list): List of National IDs
            secret_key (str): Secret key for API authentication
            batch_size (int): Number of requests per batch
            delay (int): Delay between batches in seconds
            
        Returns:
            list: List of formatted citizen data
        """
        all_citizen_data = []
        failed_nids = []
        
        total_nids = len(nids)
        processed = 0
        
        print(f"Processing {total_nids} National IDs...")
        
        for i in range(0, total_nids, batch_size):
            batch = nids[i:i + batch_size]
            
            for nid in batch:
                print(f"Processing NID {processed + 1}/{total_nids}: {nid}")
                
                citizen_data = self.get_citizen_details(nid, secret_key)
                
                if citizen_data:
                    formatted_data = self.format_citizen_data(citizen_data)
                    all_citizen_data.append(formatted_data)
                    print(f"✓ Successfully retrieved data for {nid}")
                else:
                    failed_nids.append(nid)
                    print(f"✗ Failed to retrieve data for {nid}")
                
                processed += 1
            
            # Add delay between batches to avoid overwhelming the server
            if i + batch_size < total_nids:
                print(f"Waiting {delay} seconds before next batch...")
                time.sleep(delay)
        
        print(f"\nProcessing complete!")
        print(f"Successfully processed: {len(all_citizen_data)}")
        print(f"Failed to process: {len(failed_nids)}")
        
        if failed_nids:
            print(f"Failed NIDs: {failed_nids}")
        
        return all_citizen_data, failed_nids
    
    def save_to_excel(self, citizen_data, output_file_path):
        """
        Save citizen data to Excel file
        
        Args:
            citizen_data (list): List of formatted citizen data
            output_file_path (str): Path for output Excel file
        """
        try:
            if not citizen_data:
                print("No data to save!")
                return
            
            df = pd.DataFrame(citizen_data)
            
            # Create directory if it doesn't exist (only if there's a directory path)
            output_dir = os.path.dirname(output_file_path)
            if output_dir and output_dir != '':
                os.makedirs(output_dir, exist_ok=True)
            
            # Save to Excel with formatting
            with pd.ExcelWriter(output_file_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Citizen_Data', index=False)
                
                # Get the workbook and worksheet
                workbook = writer.book
                worksheet = writer.sheets['Citizen_Data']
                
                # Auto-adjust column widths
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            print(f"Data successfully saved to: {output_file_path}")
            print(f"Total records saved: {len(citizen_data)}")
            
        except Exception as e:
            print(f"Error saving to Excel: {str(e)}")
            
    def save_successful_data(self, citizen_data):
        """
        Save successful citizen data to a new Excel file in current directory
        
        Args:
            citizen_data (list): List of formatted citizen data
            
        Returns:
            str: Path to the saved file
        """
        try:
            if not citizen_data:
                print("No successful data to save!")
                return None
            
            # Create filename with timestamp in current directory
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f"successful_citizen_data_{timestamp}.xlsx"
            
            df = pd.DataFrame(citizen_data)
            
            # Save to Excel with formatting
            with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Successful_Data', index=False)
                
                # Get the workbook and worksheet
                workbook = writer.book
                worksheet = writer.sheets['Successful_Data']
                
                # Auto-adjust column widths
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            print(f"✓ Successful data saved to: {output_file}")
            print(f"✓ Total successful records: {len(citizen_data)}")
            
            return output_file
            
        except Exception as e:
            print(f"Error saving successful data: {str(e)}")
            return None

def main():
    """
    Main function to run the NID extraction process
    """
    # Configuration
    SECRET_KEY = "WQ9Ns43QJHT77vgKZkgbaBDeR27N4pWKnefYm8t4LhUcVGB7ERP8jyQgUw89Qj3SQNRzrMZsbdN55ha9h6FgTJQ6Dae5wsAW8tS3jWY9ry7GRYPm6TfaNHbr5hZveXZu"
    
    # File paths
    input_excel_file = "Company_Employees_Sample NOGUCHI NEW UPLOAD 03-06-2025_converted.xlsx"  # Update this path
    output_excel_file = f"citizen_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    # Column name containing National IDs in your input Excel file
    nid_column_name = "National ID"  # Update this if your column has a different name
    
    # Initialize extractor
    extractor = RwandaNIDExtractor()
    
    print("Rwanda National ID Data Extractor")
    print("=" * 40)
    
    # Step 1: Extract NIDs from Excel
    print("Step 1: Extracting National IDs from Excel file...")
    nids = extractor.extract_nid_from_excel(input_excel_file, nid_column_name)
    
    if not nids:
        print("No National IDs found. Please check your Excel file and column name.")
        return
    
    # Step 2: Process NIDs and retrieve citizen data
    print("\nStep 2: Retrieving citizen data from API...")
    citizen_data, failed_nids = extractor.process_nids_batch(
        nids, 
        SECRET_KEY, 
        batch_size=3,  # Reduced batch size to be respectful to the API
        delay=3        # 3 second delay between batches
    )
    
    # Step 3: Save results to Excel
    if citizen_data:
        print("\nStep 3: Saving results to Excel...")
        extractor.save_to_excel(citizen_data, output_excel_file)
        
        # Save failed NIDs for reference
        if failed_nids:
            failed_df = pd.DataFrame({'Failed_NIDs': failed_nids})
            failed_file = f"failed_nids_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            failed_df.to_excel(failed_file, index=False)
            print(f"Failed NIDs saved to: {failed_file}")
    else:
        print("No data was successfully retrieved.")
    
    print("\nProcess completed!")

if __name__ == "__main__":
    main()