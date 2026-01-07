#!/bin/bash

# Configuration
REMOTE_HOST="z01dxyz"
CONTAINER_NAME="spectrascribe-backend"
DB_PATH="data/chat.db"
TABLE_NAME="messages"

# Command to execute inside the container
# We use node to execute a small script to delete all rows
NODE_SCRIPT="
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('${DB_PATH}');
db.run('DELETE FROM ${TABLE_NAME}', (err) => {
    if (err) {
        console.error('Error clearing chat history:', err.message);
        process.exit(1);
    } else {
        console.log('Chat history cleared successfully.');
    }
});
"

echo "Connecting to $REMOTE_HOST to clear chat history in container $CONTAINER_NAME..."

ssh "$REMOTE_HOST" "docker exec -i $CONTAINER_NAME node -e \"$NODE_SCRIPT\""

if [ $? -eq 0 ]; then
    echo "Done."
else
    echo "Failed to clear chat history."
fi
