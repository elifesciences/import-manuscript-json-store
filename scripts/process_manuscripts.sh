#!/bin/bash
SCRIPT_DIR=$(dirname "$0") # Get the directory where the script is located
ROOT_DIR=$(realpath "$SCRIPT_DIR/..") # Assume the root is one level up from the script's directory
CSV_FILE="$SCRIPT_DIR/manuscript_data.csv" # Path to the CSV file
ARTICLES_DIR="$ROOT_DIR/articles" # Path to the articles directory

# Check if the CSV file exists
if [[ ! -f "$CSV_FILE" ]]; then
    echo "Error: CSV file manuscript_data.csv not found in the script directory."
    exit 1
fi

# Create the articles directory if it doesn't exist
if [[ ! -d "$ARTICLES_DIR" ]]; then
    mkdir -p "$ARTICLES_DIR"
    echo "Created articles directory: $ARTICLES_DIR"
fi

# Process the CSV file
while IFS=',' read -r ID Preprints PublishedDate EvalSummaryID PeerReviewID AuthorResponseID Url; do
    # Skip the header row
    if [[ "$ID" != "ID" ]]; then
        (
            cd "$ROOT_DIR" || exit # Change to the root directory
            yarn --silent manuscript-data "$ID" "$Preprints" "$PublishedDate" "$EvalSummaryID" "$PeerReviewID" "$AuthorResponseID" > "$ARTICLES_DIR/$ID.json"
        )
    fi
done < "$CSV_FILE"
