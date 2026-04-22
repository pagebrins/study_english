package auth

import (
	"errors"
	"study_english/backend/internal/pkg/logger"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// Claims contains auth payload.
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken signs user token.
func GenerateToken(userID uint, secret string) (string, error) {
	logger.L().Info("jwt generate token", zap.String("request_id", "-"), zap.Uint("user_id", userID))
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		logger.L().Error("jwt generate token failed", zap.String("request_id", "-"), zap.Error(err))
	}
	return token, err
}

// ParseToken parses and validates token.
func ParseToken(tokenString, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		logger.L().Error("jwt parse token failed", zap.String("request_id", "-"), zap.Error(err))
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		logger.L().Error("jwt parse token invalid", zap.String("request_id", "-"))
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
