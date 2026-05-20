import json
import os
from confluent_kafka import Producer
from datetime import datetime

_producer = None

def get_producer() -> Producer:
    global _producer
    # Inicjalizacja producenta Kafki, jeśli jeszcze nie istnieje
    if _producer is None:
        _producer = Producer({
            # Pobranie adresu serwerów Kafki ze zmiennych środowiskowych lub użycie domyślnego
            "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092")
        })
    return _producer

def publish_expense_created(
        group_id: str,
        expense_id: str,
        paid_by_name: str,
        amount: float,
        description: str,
        created_at: datetime,
        recipient_emails: list[str]
):
    # Przygotowanie wiadomości z danymi o utworzonym wydatku
    message = {
        "group_id": group_id,
        "expense_id": expense_id,
        "paid_by_name": paid_by_name,
        "amount": amount,
        "description": description,
        "created_at": created_at.isoformat(),
        "recipient_emails": recipient_emails
    }
    
    # Wysłanie wiadomości na odpowiedni temat (topic) do Kafki
    get_producer().produce(
        topic="expense-created",
        key=str(group_id),  # Klucz wiadomości ułatwiający partycjonowanie
        value=json.dumps(message).encode("utf-8")  # Serializacja wiadomości do formatu JSON i bajtów
    )
    
    # Opróżnienie bufora, wymuszając natychmiastowe wysłanie do Kafki
    get_producer().flush()
