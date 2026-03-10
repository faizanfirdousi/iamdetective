package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/iamdetective/backend/internal/models"
	"github.com/redis/go-redis/v9"
)

type RedisService interface {
	GetCases(ctx context.Context, key string) ([]*models.CaseSchema, error)
	SetCases(ctx context.Context, key string, cases []*models.CaseSchema, expiration time.Duration) error
	GetCase(ctx context.Context, key string) (*models.CaseSchema, error)
	SetCase(ctx context.Context, key string, c *models.CaseSchema, expiration time.Duration) error
}

type redisService struct {
	client *redis.Client
}

func NewRedisService(client *redis.Client) RedisService {
	return &redisService{client: client}
}

func (s *redisService) GetCases(ctx context.Context, key string) ([]*models.CaseSchema, error) {
	val, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cache miss
		}
		return nil, err
	}

	var cases []*models.CaseSchema
	err = json.Unmarshal([]byte(val), &cases)
	if err != nil {
		return nil, err
	}
	return cases, nil
}

func (s *redisService) SetCases(ctx context.Context, key string, cases []*models.CaseSchema, expiration time.Duration) error {
	data, err := json.Marshal(cases)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, key, data, expiration).Err()
}

func (s *redisService) GetCase(ctx context.Context, key string) (*models.CaseSchema, error) {
	val, err := s.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cache miss
		}
		return nil, err
	}

	var c models.CaseSchema
	err = json.Unmarshal([]byte(val), &c)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *redisService) SetCase(ctx context.Context, key string, c *models.CaseSchema, expiration time.Duration) error {
	data, err := json.Marshal(c)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, key, data, expiration).Err()
}

func BuildSearchCacheKey(query, jurisdiction, status, source string, page, limit int) string {
	return fmt.Sprintf("search:cases:q=%s:j=%s:s=%s:src=%s:p=%d:l=%d", query, jurisdiction, status, source, page, limit)
}
