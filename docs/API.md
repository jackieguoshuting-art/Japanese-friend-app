# API Outline

## POST /api/chat
Used by the future Claude integration layer.

Request:
```json
{
  "characterId": "yuki",
  "topicId": "topic_01_weekend",
  "prompt": "..."
}
```

Response:
```json
{
  "replyJa": "ねえ、楽しそう！どんな映画だったの？",
  "replyEn": "That sounds fun! What kind of movie was it?",
  "memoryCandidate": "User likes movies"
}
```
