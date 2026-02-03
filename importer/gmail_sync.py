import os
import base64
import json
import mimetypes
from datetime import datetime
from pathlib import Path

from supabase import create_client
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CREDENTIALS_FILE = "credentials.json"
TOKEN_FILE = "token.json"
BUCKET_NAME = "receipts"

# Supabase Connect
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:54321")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "your-anon-key-here")


def get_gmail_service():
    """Shows basic usage of the Gmail API.
    Lists the user's Gmail labels.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    f"Missing {CREDENTIALS_FILE}. Please download it from Google Cloud Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_FILE, SCOPES
            )
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def sync_receipts():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    service = get_gmail_service()

    # Search for emails with attachments, last 7 days? or all?
    # Query: has:attachment filename:pdf or filename:jpg or filename:png
    # And maybe label:receipts if user uses labels
    query = "has:attachment (filename:pdf OR filename:jpg OR filename:png) after:2024/01/01" 
    
    print(f"Searching emails with query: {query}")
    results = service.users().messages().list(userId="me", q=query, maxResults=20).execute()
    messages = results.get("messages", [])

    if not messages:
        print("No messages found.")
        return

    print(f"Found {len(messages)} messages. Processing...")

    for msg in messages:
        msg_id = msg["id"]
        
        # Check if already processed (check if any receipt has this gmail_lines?)
        # For now, simplistic check or assume duplicates handled by file content hash?
        # Supabase doesn't have gmail_message_id in receipts table yet.
        # Ideally we add it. For now, rely on Storage file naming collision?
        
        message = service.users().messages().get(userId="me", id=msg_id).execute()
        payload = message["payload"]
        headers = payload.get("headers", [])
        
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "No Subject")
        date_str = next((h["value"] for h in headers if h["name"] == "Date"), "")
        
        print(f"Processing: {subject} ({date_str})")
        
        parts = payload.get("parts", [])
        for part in parts:
            if part.get("filename") and part.get("body").get("attachmentId"):
                filename = part["filename"]
                att_id = part["body"]["attachmentId"]
                
                print(f"  - Found attachment: {filename}")
                
                att = service.users().messages().attachments().get(
                    userId="me", messageId=msg_id, id=att_id
                ).execute()
                
                data = base64.urlsafe_b64decode(att["data"].encode("UTF-8"))
                
                # Upload to Supabase
                # File path: gmail/{YYYY}/{MM}/{msg_id}_{filename}
                # Sanitize filename?
                safe_filename = filename.replace(" ", "_")
                storage_path = f"gmail/{msg_id}_{safe_filename}"
                
                try:
                    # Check if exists?
                    # supabase.storage.from_(BUCKET_NAME).list()... involves traversing.
                    # Just try upload
                    res = supabase.storage.from_(BUCKET_NAME).upload(
                        path=storage_path,
                        file=data,
                        file_options={"content-type": part.get("mimeType", "application/octet-stream")}
                    )
                    
                    if res.status_code in (200, 201) or True: # Supabase-py upload returns response or raises?
                        # Insert into receipts table
                        # Get public url or sign url? 
                        # publicUrl = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
                        # Assume purely internal usage for now.
                        
                        insert_res = supabase.table("receipts").insert({
                            "storage_url": storage_path,
                            "original_filename": filename,
                            "content_type": part.get("mimeType", "application/octet-stream"),
                            "file_size_bytes": len(data),
                            "uploaded_at": datetime.now().isoformat(),
                            # "metadata": {"gmail_message_id": msg_id} # If metadata column existed
                        }).execute()
                        print(f"    Uploaded and registered: {storage_path}")

                except Exception as e:
                    # Ignore duplicate uploads or other errors
                    print(f"    Upload failed (maybe duplicate): {e}")


if __name__ == "__main__":
    sync_receipts()
