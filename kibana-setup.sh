#!/bin/bash

# Aguarda o Elasticsearch estar pronto
echo "Aguardando Elasticsearch..."
until curl -s http://elasticsearch:9200 > /dev/null; do
    sleep 1
done

# Aguarda o Kibana estar pronto
echo "Aguardando Kibana..."
until curl -s http://kibana:5601 > /dev/null; do
    sleep 1
done

# Configura o índice de pedidos
echo "Configurando índice de pedidos..."
curl -X PUT "http://elasticsearch:9200/orders" -H "Content-Type: application/json" -d'
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "customerName": { "type": "text" },
      "customerEmail": { "type": "keyword" },
      "totalAmount": { "type": "float" },
      "status": { "type": "keyword" },
      "items": {
        "type": "nested",
        "properties": {
          "productId": { "type": "keyword" },
          "quantity": { "type": "integer" },
          "price": { "type": "float" }
        }
      },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}'

# Configura o padrão de índice
echo "Configurando padrão de índice..."
curl -X PUT "http://elasticsearch:9200/_template/orders" -H "Content-Type: application/json" -d'
{
  "index_patterns": ["orders*"],
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "customerName": { "type": "text" },
      "customerEmail": { "type": "keyword" },
      "totalAmount": { "type": "float" },
      "status": { "type": "keyword" },
      "items": {
        "type": "nested",
        "properties": {
          "productId": { "type": "keyword" },
          "quantity": { "type": "integer" },
          "price": { "type": "float" }
        }
      },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}'

echo "Configuração do Kibana concluída!" 