package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/xuri/excelize/v2"
)

func main() {
	inputFile := "/Users/shanwang/company/study_english/aaa.xlsx"
	outputFile := "import_words.sql"

	f, err := excelize.OpenFile(inputFile)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	rows, err := f.GetRows("Sheet1")
	if err != nil {
		log.Fatal(err)
	}

	sqlFile, err := os.Create(outputFile)
	if err != nil {
		log.Fatal(err)
	}
	defer sqlFile.Close()

	_, _ = sqlFile.WriteString("-- 单词数据导入脚本\n")
	_, _ = sqlFile.WriteString("USE study_english;\n\n")

	currentL1Category := ""
	currentL2Category := ""

	for _, row := range rows {
		rowL1Category := normalizeCategory(getCell(row, 0))
		rowL2Category := normalizeCategory(getCell(row, 1))
		word := escapeSQL(strings.TrimSpace(getCell(row, 3)))
		definition := escapeSQL(strings.TrimSpace(getCell(row, 4)))
		example := ""

		if rowL1Category == "" {
			currentL1Category = ""
			currentL2Category = ""
		} else {
			if rowL1Category != currentL1Category {
				currentL1Category = rowL1Category
				currentL2Category = ""
			}
			if rowL2Category != "" {
				currentL2Category = rowL2Category
			}
		}

		if word == "" {
			continue
		}

		query := fmt.Sprintf(
			"INSERT INTO `words` (`word`, `definition`, `l1_category`, `l2_category`, `example`, `created_at`, `updated_at`) "+
				"VALUES ('%s', '%s', '%s', '%s', '%s', NOW(), NOW());\n",
			word,
			definition,
			escapeSQL(currentL1Category),
			escapeSQL(currentL2Category),
			example,
		)
		_, _ = sqlFile.WriteString(query)
	}

	fmt.Printf("SQL 脚本生成成功：%s\n", outputFile)
}

func getCell(row []string, index int) string {
	if index < 0 || index >= len(row) {
		return ""
	}
	return row[index]
}

func normalizeCategory(str string) string {
	str = strings.TrimSpace(str)
	str = strings.TrimSuffix(str, "：")
	str = strings.TrimSuffix(str, ":")
	return str
}

func escapeSQL(str string) string {
	return strings.ReplaceAll(str, "'", "''")
}
