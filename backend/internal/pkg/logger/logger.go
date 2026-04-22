package logger

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var appLogger *zap.Logger

// Init initializes project logger with file rotation.
func Init() error {
	if err := os.MkdirAll("log", 0o755); err != nil {
		return err
	}
	logWriter := &lumberjack.Logger{
		Filename:   filepath.Join("log", "app.log"),
		MaxSize:    20,
		MaxBackups: 30,
		MaxAge:     14,
		Compress:   true,
	}
	startDailyRotate(logWriter)

	encoderCfg := zap.NewProductionEncoderConfig()
	encoderCfg.TimeKey = "time"
	encoderCfg.LevelKey = "level"
	encoderCfg.CallerKey = "caller"
	encoderCfg.MessageKey = "msg"
	encoderCfg.NameKey = ""
	encoderCfg.StacktraceKey = ""
	encoderCfg.LineEnding = zapcore.DefaultLineEnding
	encoderCfg.ConsoleSeparator = "|"
	encoderCfg.EncodeTime = func(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
		enc.AppendString(t.Format("2006-01-02 15:04:05.000"))
	}
	encoderCfg.EncodeLevel = zapcore.LowercaseLevelEncoder
	encoderCfg.EncodeCaller = zapcore.ShortCallerEncoder

	baseCore := zapcore.NewCore(
		zapcore.NewConsoleEncoder(encoderCfg),
		zapcore.AddSync(logWriter),
		zap.InfoLevel,
	)
	core := &requestIDCore{core: baseCore}
	appLogger = zap.New(core, zap.AddCaller(), zap.AddCallerSkip(1))
	return nil
}

// L returns app logger.
func L() *zap.Logger {
	if appLogger != nil {
		return appLogger
	}
	fallback, _ := zap.NewProduction()
	return fallback
}

func startDailyRotate(writer *lumberjack.Logger) {
	go func() {
		now := time.Now()
		next := now.Truncate(24 * time.Hour).Add(24 * time.Hour)
		timer := time.NewTimer(time.Until(next))
		for range timer.C {
			_ = writer.Rotate()
			timer.Reset(24 * time.Hour)
		}
	}()
}

type requestIDCore struct {
	core zapcore.Core
}

func (c *requestIDCore) Enabled(level zapcore.Level) bool {
	return c.core.Enabled(level)
}

func (c *requestIDCore) With(fields []zapcore.Field) zapcore.Core {
	return &requestIDCore{core: c.core.With(fields)}
}

func (c *requestIDCore) Check(entry zapcore.Entry, checked *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if c.Enabled(entry.Level) {
		return checked.AddCore(entry, c)
	}
	return checked
}

func (c *requestIDCore) Write(entry zapcore.Entry, fields []zapcore.Field) error {
	requestID := "-"
	filtered := make([]zapcore.Field, 0, len(fields))
	for _, field := range fields {
		if field.Key == "request_id" {
			switch field.Type {
			case zapcore.StringType:
				if field.String != "" {
					requestID = field.String
				}
			case zapcore.ErrorType:
				if field.Interface != nil {
					requestID = fmt.Sprint(field.Interface)
				}
			default:
				requestID = field.String
			}
			continue
		}
		filtered = append(filtered, field)
	}
	cloned := entry
	cloned.Message = requestID + "|" + entry.Message
	return c.core.Write(cloned, filtered)
}

func (c *requestIDCore) Sync() error {
	return c.core.Sync()
}
