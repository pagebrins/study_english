package response

import "github.com/gin-gonic/gin"

// JSON sends standard response body.
func JSON(ctx *gin.Context, code int, msg string, result any) {
	ctx.JSON(code, gin.H{
		"code":   code,
		"msg":    msg,
		"result": result,
	})
}
