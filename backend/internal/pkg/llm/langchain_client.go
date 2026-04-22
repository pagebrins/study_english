package llm

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/openai"
)

// Client wraps LangChain model invocation.
type Client struct {
	model         llms.Model
	temperature   float64
	maxTokens     int
	contextLength int
}

const (
	defaultMaxTokens     = 4096
	defaultContextLength = 32768
)

// NewClient creates a LangChain OpenAI-compatible client.
func NewClient(endpoint, modelName, apiKey string, temperature float64) (*Client, error) {
	baseURL, err := normalizeBaseURL(endpoint)
	if err != nil {
		return nil, err
	}
	token := strings.TrimSpace(apiKey)
	if token == "" {
		token = "ollama"
	}
	model, err := openai.New(
		openai.WithBaseURL(baseURL),
		openai.WithModel(modelName),
		openai.WithToken(token),
	)
	if err != nil {
		return nil, err
	}
	return &Client{
		model:         model,
		temperature:   temperature,
		maxTokens:     defaultMaxTokens,
		contextLength: defaultContextLength,
	}, nil
}

// Generate runs a non-streaming completion and returns full content.
func (c *Client) Generate(ctx context.Context, prompt string) (string, error) {
	text, err := llms.GenerateFromSinglePrompt(
		ctx,
		c.model,
		prompt,
		c.callOptions()...,
	)
	if err != nil {
		return "", err
	}
	return text, nil
}

// StreamGenerate streams tokens and returns the aggregated content.
func (c *Client) StreamGenerate(
	ctx context.Context,
	prompt string,
	onChunk func(string) error,
) (string, error) {
	var builder strings.Builder
	options := append(c.callOptions(), llms.WithStreamingFunc(func(_ context.Context, chunk []byte) error {
		text := string(chunk)
		builder.WriteString(text)
		if onChunk != nil {
			return onChunk(text)
		}
		return nil
	}))
	_, err := c.model.GenerateContent(
		ctx,
		[]llms.MessageContent{
			llms.TextParts(llms.ChatMessageTypeHuman, prompt),
		},
		options...,
	)
	if err != nil {
		return "", err
	}
	return builder.String(), nil
}

func (c *Client) callOptions() []llms.CallOption {
	options := []llms.CallOption{
		llms.WithTemperature(c.temperature),
		llms.WithMaxTokens(c.maxTokens),
		// For OpenAI-compatible endpoints that accept extra metadata.
		llms.WithMetadata(map[string]any{
			"context_length": c.contextLength,
		}),
	}
	return options
}

func normalizeBaseURL(endpoint string) (string, error) {
	raw := strings.TrimSpace(endpoint)
	if raw == "" {
		return "", fmt.Errorf("llm endpoint is empty")
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid llm endpoint: %w", err)
	}
	parsed.Path = strings.TrimSuffix(parsed.Path, "/chat/completions")
	parsed.Path = strings.TrimSuffix(parsed.Path, "/v1/completions")
	return strings.TrimRight(parsed.String(), "/"), nil
}
