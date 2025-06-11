import json
import time
import os
import numpy as np
import google.generativeai as genai

# Configure Gemini API from environment variable
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("Error: GOOGLE_API_KEY environment variable not set.")
    print("Please set your Gemini API key: export GOOGLE_API_KEY='your_api_key_here'")
    exit(1)

try:
    genai.configure(api_key=GOOGLE_API_KEY)
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    exit(1)

def create_int8_embedding(float_embedding):
    """Quantizes a float embedding vector to int8 for storage efficiency."""
    clamped_embedding = np.clip(np.array(float_embedding), -1.0, 1.0)
    quantized = np.round(clamped_embedding * 127.0).astype(np.int8)
    return quantized.tolist()

def process_batch(batch_texts, batch_items, outfile, processed_stats):
    """Process a single batch of texts through Gemini embedding API."""
    if not batch_texts:
        return

    try:
        response = genai.embed_content(
            model='models/text-embedding-004', 
            content=batch_texts,
            task_type="RETRIEVAL_DOCUMENT" 
        )
        
        embeddings_float_list = response.get('embedding')

        if embeddings_float_list and len(embeddings_float_list) == len(batch_texts):
            for original_item, embedding_float in zip(batch_items, embeddings_float_list):
                if processed_stats['limit'] and processed_stats['count'] >= processed_stats['limit']:
                    return

                embedding_int8 = create_int8_embedding(embedding_float)
                
                output_data = original_item.copy()
                output_data["embedding_int8"] = embedding_int8

                outfile.write(json.dumps(output_data) + '\n')
                
                processed_stats['count'] += 1
                processed_stats['since_last_log'] += 1

                if processed_stats['since_last_log'] >= 100:
                    print(f"Processed {processed_stats['count']} embeddings")
                    processed_stats['since_last_log'] = 0
            
            processed_stats['requests_in_window'] += 1

        else:
            print(f"Warning: Embedding count mismatch for batch of {len(batch_texts)} items")

    except Exception as e:
        print(f"Error processing batch: {e}")
        if "API key not valid" in str(e):
            print("Invalid API key. Exiting.")
            exit(1)
        
        processed_stats['requests_in_window'] += 1
        time.sleep(5)

def generate_and_quantize_embeddings(input_file, output_file, start=0, limit=None, batch_size=100):
    """
    Generate embeddings for arXiv papers and quantize to int8.
    
    Args:
        input_file: Path to input JSONL file
        output_file: Path to output JSONL file with embeddings
        start: Line number to start processing from
        limit: Maximum number of items to process
        batch_size: Number of items to process in each API call
    """
    rate_limit_per_minute = 1500 
    
    processed_stats = {
        'count': 0,
        'since_last_log': 0,
        'requests_in_window': 0,
        'window_start_time': time.time(),
        'limit': limit
    }

    batch_texts = []
    batch_items = []

    print(f"Starting embedding generation from {input_file}")
    print(f"Output: {output_file} | Batch size: {batch_size}")
    
    if start > 0:
        print(f"Starting from line {start}")
    if limit:
        print(f"Processing limit: {limit} items")

    try:
        with open(input_file, 'r', encoding='utf-8') as infile, \
             open(output_file, 'w', encoding='utf-8') as outfile:
            
            for i, line in enumerate(infile):
                if i < start:
                    continue

                if processed_stats['limit'] and processed_stats['count'] >= processed_stats['limit']:
                    print(f"Reached processing limit of {processed_stats['limit']} items")
                    break
                
                try:
                    item = json.loads(line)
                    # Extract paper metadata for embedding
                    title = item.get('title', '') or ''
                    authors = item.get('authors', '') or ''
                    abstract = item.get('abstract', '') or ''
                    
                    # Concatenate: title + authors + abstract
                    text_to_embed = f"{title} {authors} {abstract}".strip()

                    if not text_to_embed:
                        continue

                    batch_texts.append(text_to_embed)
                    batch_items.append(item)

                    if len(batch_texts) >= batch_size:
                        # Rate limiting logic
                        current_time = time.time()
                        if current_time - processed_stats['window_start_time'] >= 60:
                            processed_stats['window_start_time'] = current_time
                            processed_stats['requests_in_window'] = 0
                        
                        if processed_stats['requests_in_window'] >= rate_limit_per_minute:
                            wait_time = 60.0 - (current_time - processed_stats['window_start_time'])
                            if wait_time > 0:
                                print(f"Rate limit reached. Waiting {wait_time:.1f}s...")
                                time.sleep(wait_time)
                            processed_stats['window_start_time'] = time.time()
                            processed_stats['requests_in_window'] = 0
                        
                        process_batch(batch_texts, batch_items, outfile, processed_stats)
                        batch_texts = []
                        batch_items = []

                except json.JSONDecodeError as e:
                    print(f"JSON decode error on line {i+1}: {e}")
            
            # Process remaining items
            if batch_texts and (not processed_stats['limit'] or processed_stats['count'] < processed_stats['limit']):
                current_time = time.time()
                if current_time - processed_stats['window_start_time'] >= 60:
                    processed_stats['window_start_time'] = current_time
                    processed_stats['requests_in_window'] = 0
                    
                if processed_stats['requests_in_window'] >= rate_limit_per_minute:
                    wait_time = 60.0 - (current_time - processed_stats['window_start_time'])
                    if wait_time > 0:
                        print(f"Rate limit reached. Waiting {wait_time:.1f}s...")
                        time.sleep(wait_time)
                    processed_stats['window_start_time'] = time.time()
                    processed_stats['requests_in_window'] = 0
                
                process_batch(batch_texts, batch_items, outfile, processed_stats)

    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found")
        return
    except Exception as e:
        print(f"Unexpected error: {e}")
        return

    print(f"Completed: {processed_stats['count']} embeddings generated")
    print(f"Output saved to {output_file}")

if __name__ == "__main__":
    # Configuration
    input_filename = "input_papers.jsonl"
    output_filename = "output_papers_with_embeddings.jsonl"
    
    start_line = 0
    process_limit = None
    batch_size = 100
    
    if not os.path.exists(input_filename):
        print(f"Error: Input file '{input_filename}' not found")
        print("Please provide your arXiv papers JSONL file")
        exit(1)

    print("arXade Embedding Generator")
    print("=" * 30)
    
    generate_and_quantize_embeddings(
        input_filename, 
        output_filename, 
        start=start_line, 
        limit=process_limit, 
        batch_size=batch_size
    )
    
    print("Processing complete!")
