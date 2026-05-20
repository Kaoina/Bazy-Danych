package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/confluentinc/confluent-kafka-go/kafka"
	"gopkg.in/gomail.v2"
)

// ExpenseCreatedEvent przechowuje dane o zdarzeniu utworzenia nowego wydatku.
// Struktura ta jest używana do deserializacji wiadomości z Kafki.
type ExpenseCreatedEvent struct {
	GroupID         string   `json:"group_id"`
	ExpenseID       string   `json:"expense_id"`
	PaidByName      string   `json:"paid_by_name"`
	Amount          float64  `json:"amount"`
	Description     string   `json:"description"`
	CreatedAt       string   `json:"created_at"`
	RecipientEmails []string `json:"recipient_emails"`
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func sendEmails(event ExpenseCreatedEvent) error {
	// Pobranie konfiguracji serwera SMTP ze zmiennych środowiskowych lub użycie wartości domyślnych.
	host := getEnv("SMTP_HOST", "mailpit")
	port, _ := strconv.Atoi(getEnv("SMTP_PORT", "1025"))

	// Utworzenie dialera do połączenia z serwerem SMTP.
	d := gomail.NewDialer(host, port, "", "")
	d.SSL = false // Wyłączenie SSL, przydatne w środowisku deweloperskim (np. z Mailpit).

	// Pętla przez wszystkich odbiorców i wysyłka indywidualnych maili.
	for _, email := range event.RecipientEmails {
		m := gomail.NewMessage()
		m.SetHeader("From", getEnv("SMTP_FROM", "noreply@splitapp.com"))
		m.SetHeader("To", email)
		m.SetHeader("Subject", fmt.Sprintf("Nowy wydatek: %s", event.Description))
		m.SetBody("text/plain", fmt.Sprintf(
			"Hej!\n\n%s dodał(a) nowy wydatek w grupie:\n\nOpis: %s\nKwota: %.2f zł\n\nSprawdź aplikację po szczegóły.",
			event.PaidByName,
			event.Description,
			event.Amount,
		))

		// Próba wysłania maila i logowanie wyniku.
		if err := d.DialAndSend(m); err != nil {
			log.Printf("Błąd wysyłki do %s: %v", email, err)
		} else {
			log.Printf("Mail wysłany do: %s", email)
		}
	}
	return nil
}

func main() {
	consumer, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers": getEnv("KAFKA_BOOTSTRAP_SERVERS", "kafka:29092"),
		"group.id":          "notification-service",
		"auto.offset.reset": "earliest",
	})
	if err != nil {
		log.Fatalf("Błąd tworzenia konsumenta: %v", err)
	}
	defer consumer.Close()

	if err := consumer.SubscribeTopics([]string{"expense-created"}, nil); err != nil {
		log.Fatalf("Błąd subskrypcji: %v", err)
	}

	for {
		msg, err := consumer.ReadMessage(-1)
		if err != nil {
			log.Printf("Błąd odczytu: %v", err)
			continue
		}

		var event ExpenseCreatedEvent
		if err := json.Unmarshal(msg.Value, &event); err != nil {
			log.Printf("Błąd parsowania JSON: %v", err)
			continue
		}

		log.Printf("Nowy wydatek od %s: %s (%.2f zł) → %d odbiorców",
			event.PaidByName, event.Description, event.Amount, len(event.RecipientEmails))

		sendEmails(event)
	}
}
