#!/bin/sh
echo "Iniciando entrypoint.sh"

# Espera PostgreSQL
until nc -z $DATABASE_HOST $DATABASE_PORT; do
  echo "Esperando PostgreSQL..."
  sleep 2
done

# Espera Kafka
until nc -z kafka 9092; do
  echo "Esperando Kafka..."
  sleep 2
done

# Espera Elasticsearch
until curl -s $ELASTICSEARCH_NODE >/dev/null; do
  echo "Esperando Elasticsearch..."
  sleep 2
done

echo "Iniciando aplicação..."
npm run start:prod
echo "Aplicação iniciada com sucesso!"