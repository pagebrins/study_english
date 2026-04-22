USE study_english;

START TRANSACTION;

-- L1: 词汇与表达
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '词汇与表达', NULL, 1, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '词汇与表达' AND parent_id IS NULL AND level = 1
);
SELECT id INTO @l1_vocab FROM themes WHERE name = '词汇与表达' AND parent_id IS NULL AND level = 1 ORDER BY id DESC LIMIT 1;

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '高频基础词', @l1_vocab, 2, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '高频基础词' AND parent_id = @l1_vocab AND level = 2
);
SELECT id INTO @l2_vocab_1 FROM themes WHERE name = '高频基础词' AND parent_id = @l1_vocab AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '日常动词', @l2_vocab_1, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '日常动词' AND parent_id = @l2_vocab_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '常见名词', @l2_vocab_1, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '常见名词' AND parent_id = @l2_vocab_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '形容词与副词', @l2_vocab_1, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '形容词与副词' AND parent_id = @l2_vocab_1 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '词组与搭配', @l1_vocab, 2, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '词组与搭配' AND parent_id = @l1_vocab AND level = 2
);
SELECT id INTO @l2_vocab_2 FROM themes WHERE name = '词组与搭配' AND parent_id = @l1_vocab AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '动词短语', @l2_vocab_2, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '动词短语' AND parent_id = @l2_vocab_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '固定搭配', @l2_vocab_2, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '固定搭配' AND parent_id = @l2_vocab_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '介词搭配', @l2_vocab_2, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '介词搭配' AND parent_id = @l2_vocab_2 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '词义辨析', @l1_vocab, 2, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '词义辨析' AND parent_id = @l1_vocab AND level = 2
);
SELECT id INTO @l2_vocab_3 FROM themes WHERE name = '词义辨析' AND parent_id = @l1_vocab AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '近义词辨析', @l2_vocab_3, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '近义词辨析' AND parent_id = @l2_vocab_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '易混词辨析', @l2_vocab_3, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '易混词辨析' AND parent_id = @l2_vocab_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '词性转换', @l2_vocab_3, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '词性转换' AND parent_id = @l2_vocab_3 AND level = 3);

-- L1: 语法与句法
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '语法与句法', NULL, 1, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '语法与句法' AND parent_id IS NULL AND level = 1
);
SELECT id INTO @l1_grammar FROM themes WHERE name = '语法与句法' AND parent_id IS NULL AND level = 1 ORDER BY id DESC LIMIT 1;

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '时态与语态', @l1_grammar, 2, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '时态与语态' AND parent_id = @l1_grammar AND level = 2
);
SELECT id INTO @l2_grammar_1 FROM themes WHERE name = '时态与语态' AND parent_id = @l1_grammar AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '一般时态', @l2_grammar_1, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '一般时态' AND parent_id = @l2_grammar_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '完成时态', @l2_grammar_1, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '完成时态' AND parent_id = @l2_grammar_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '被动语态', @l2_grammar_1, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '被动语态' AND parent_id = @l2_grammar_1 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '从句与连接', @l1_grammar, 2, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '从句与连接' AND parent_id = @l1_grammar AND level = 2
);
SELECT id INTO @l2_grammar_2 FROM themes WHERE name = '从句与连接' AND parent_id = @l1_grammar AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '名词性从句', @l2_grammar_2, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '名词性从句' AND parent_id = @l2_grammar_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '定语从句', @l2_grammar_2, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '定语从句' AND parent_id = @l2_grammar_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '状语从句', @l2_grammar_2, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '状语从句' AND parent_id = @l2_grammar_2 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '句子结构', @l1_grammar, 2, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '句子结构' AND parent_id = @l1_grammar AND level = 2
);
SELECT id INTO @l2_grammar_3 FROM themes WHERE name = '句子结构' AND parent_id = @l1_grammar AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '简单句', @l2_grammar_3, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '简单句' AND parent_id = @l2_grammar_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '并列句', @l2_grammar_3, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '并列句' AND parent_id = @l2_grammar_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '复合句', @l2_grammar_3, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '复合句' AND parent_id = @l2_grammar_3 AND level = 3);

-- L1: 翻译技巧
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '翻译技巧', NULL, 1, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '翻译技巧' AND parent_id IS NULL AND level = 1
);
SELECT id INTO @l1_translate FROM themes WHERE name = '翻译技巧' AND parent_id IS NULL AND level = 1 ORDER BY id DESC LIMIT 1;

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '直译与意译', @l1_translate, 2, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '直译与意译' AND parent_id = @l1_translate AND level = 2
);
SELECT id INTO @l2_translate_1 FROM themes WHERE name = '直译与意译' AND parent_id = @l1_translate AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '直译策略', @l2_translate_1, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '直译策略' AND parent_id = @l2_translate_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '意译策略', @l2_translate_1, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '意译策略' AND parent_id = @l2_translate_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '直意结合', @l2_translate_1, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '直意结合' AND parent_id = @l2_translate_1 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '增译与省译', @l1_translate, 2, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '增译与省译' AND parent_id = @l1_translate AND level = 2
);
SELECT id INTO @l2_translate_2 FROM themes WHERE name = '增译与省译' AND parent_id = @l1_translate AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '信息增补', @l2_translate_2, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '信息增补' AND parent_id = @l2_translate_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '信息省略', @l2_translate_2, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '信息省略' AND parent_id = @l2_translate_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '语序调整', @l2_translate_2, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '语序调整' AND parent_id = @l2_translate_2 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '风格与语气', @l1_translate, 2, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '风格与语气' AND parent_id = @l1_translate AND level = 2
);
SELECT id INTO @l2_translate_3 FROM themes WHERE name = '风格与语气' AND parent_id = @l1_translate AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '正式语体', @l2_translate_3, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '正式语体' AND parent_id = @l2_translate_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '中性语体', @l2_translate_3, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '中性语体' AND parent_id = @l2_translate_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '口语语体', @l2_translate_3, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '口语语体' AND parent_id = @l2_translate_3 AND level = 3);

-- L1: 场景主题
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '场景主题', NULL, 1, 40
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '场景主题' AND parent_id IS NULL AND level = 1
);
SELECT id INTO @l1_scene FROM themes WHERE name = '场景主题' AND parent_id IS NULL AND level = 1 ORDER BY id DESC LIMIT 1;

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '商务职场', @l1_scene, 2, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '商务职场' AND parent_id = @l1_scene AND level = 2
);
SELECT id INTO @l2_scene_1 FROM themes WHERE name = '商务职场' AND parent_id = @l1_scene AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '邮件沟通', @l2_scene_1, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '邮件沟通' AND parent_id = @l2_scene_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '会议表达', @l2_scene_1, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '会议表达' AND parent_id = @l2_scene_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '项目汇报', @l2_scene_1, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '项目汇报' AND parent_id = @l2_scene_1 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '科技互联网', @l1_scene, 2, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '科技互联网' AND parent_id = @l1_scene AND level = 2
);
SELECT id INTO @l2_scene_2 FROM themes WHERE name = '科技互联网' AND parent_id = @l1_scene AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '产品功能', @l2_scene_2, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '产品功能' AND parent_id = @l2_scene_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '数据分析', @l2_scene_2, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '数据分析' AND parent_id = @l2_scene_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '安全合规', @l2_scene_2, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '安全合规' AND parent_id = @l2_scene_2 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '生活服务', @l1_scene, 2, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '生活服务' AND parent_id = @l1_scene AND level = 2
);
SELECT id INTO @l2_scene_3 FROM themes WHERE name = '生活服务' AND parent_id = @l1_scene AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '购物消费', @l2_scene_3, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '购物消费' AND parent_id = @l2_scene_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '出行旅游', @l2_scene_3, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '出行旅游' AND parent_id = @l2_scene_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '健康医疗', @l2_scene_3, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '健康医疗' AND parent_id = @l2_scene_3 AND level = 3);

-- L1: 文章与篇章
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '文章与篇章', NULL, 1, 50
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '文章与篇章' AND parent_id IS NULL AND level = 1
);
SELECT id INTO @l1_article FROM themes WHERE name = '文章与篇章' AND parent_id IS NULL AND level = 1 ORDER BY id DESC LIMIT 1;

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '段落理解', @l1_article, 2, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '段落理解' AND parent_id = @l1_article AND level = 2
);
SELECT id INTO @l2_article_1 FROM themes WHERE name = '段落理解' AND parent_id = @l1_article AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '主题句识别', @l2_article_1, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '主题句识别' AND parent_id = @l2_article_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '逻辑关系', @l2_article_1, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '逻辑关系' AND parent_id = @l2_article_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '细节定位', @l2_article_1, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '细节定位' AND parent_id = @l2_article_1 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '结构分析', @l1_article, 2, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '结构分析' AND parent_id = @l1_article AND level = 2
);
SELECT id INTO @l2_article_2 FROM themes WHERE name = '结构分析' AND parent_id = @l1_article AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '开头引入', @l2_article_2, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '开头引入' AND parent_id = @l2_article_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '主体展开', @l2_article_2, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '主体展开' AND parent_id = @l2_article_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '结尾总结', @l2_article_2, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '结尾总结' AND parent_id = @l2_article_2 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '改写与总结', @l1_article, 2, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '改写与总结' AND parent_id = @l1_article AND level = 2
);
SELECT id INTO @l2_article_3 FROM themes WHERE name = '改写与总结' AND parent_id = @l1_article AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '同义改写', @l2_article_3, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '同义改写' AND parent_id = @l2_article_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '摘要压缩', @l2_article_3, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '摘要压缩' AND parent_id = @l2_article_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '扩展写作', @l2_article_3, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '扩展写作' AND parent_id = @l2_article_3 AND level = 3);

-- L1: 考试与训练
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '考试与训练', NULL, 1, 60
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '考试与训练' AND parent_id IS NULL AND level = 1
);
SELECT id INTO @l1_exam FROM themes WHERE name = '考试与训练' AND parent_id IS NULL AND level = 1 ORDER BY id DESC LIMIT 1;

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT 'CET与校考', @l1_exam, 2, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = 'CET与校考' AND parent_id = @l1_exam AND level = 2
);
SELECT id INTO @l2_exam_1 FROM themes WHERE name = 'CET与校考' AND parent_id = @l1_exam AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '词汇题', @l2_exam_1, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '词汇题' AND parent_id = @l2_exam_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '翻译题', @l2_exam_1, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '翻译题' AND parent_id = @l2_exam_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '写作题', @l2_exam_1, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '写作题' AND parent_id = @l2_exam_1 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '雅思托福', @l1_exam, 2, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '雅思托福' AND parent_id = @l1_exam AND level = 2
);
SELECT id INTO @l2_exam_2 FROM themes WHERE name = '雅思托福' AND parent_id = @l1_exam AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '学术词汇', @l2_exam_2, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '学术词汇' AND parent_id = @l2_exam_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '学术写作', @l2_exam_2, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '学术写作' AND parent_id = @l2_exam_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '口语表达', @l2_exam_2, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '口语表达' AND parent_id = @l2_exam_2 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '面试求职', @l1_exam, 2, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '面试求职' AND parent_id = @l1_exam AND level = 2
);
SELECT id INTO @l2_exam_3 FROM themes WHERE name = '面试求职' AND parent_id = @l1_exam AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '自我介绍', @l2_exam_3, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '自我介绍' AND parent_id = @l2_exam_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '经验描述', @l2_exam_3, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '经验描述' AND parent_id = @l2_exam_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '行为问题', @l2_exam_3, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '行为问题' AND parent_id = @l2_exam_3 AND level = 3);

-- L1: 文化与传播
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '文化与传播', NULL, 1, 70
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '文化与传播' AND parent_id IS NULL AND level = 1
);
SELECT id INTO @l1_culture FROM themes WHERE name = '文化与传播' AND parent_id IS NULL AND level = 1 ORDER BY id DESC LIMIT 1;

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '社会文化', @l1_culture, 2, 10
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '社会文化' AND parent_id = @l1_culture AND level = 2
);
SELECT id INTO @l2_culture_1 FROM themes WHERE name = '社会文化' AND parent_id = @l1_culture AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '节日文化', @l2_culture_1, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '节日文化' AND parent_id = @l2_culture_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '社会议题', @l2_culture_1, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '社会议题' AND parent_id = @l2_culture_1 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '媒体表达', @l2_culture_1, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '媒体表达' AND parent_id = @l2_culture_1 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '跨文化沟通', @l1_culture, 2, 20
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '跨文化沟通' AND parent_id = @l1_culture AND level = 2
);
SELECT id INTO @l2_culture_2 FROM themes WHERE name = '跨文化沟通' AND parent_id = @l1_culture AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '礼貌表达', @l2_culture_2, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '礼貌表达' AND parent_id = @l2_culture_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '文化差异', @l2_culture_2, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '文化差异' AND parent_id = @l2_culture_2 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '误解修复', @l2_culture_2, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '误解修复' AND parent_id = @l2_culture_2 AND level = 3);

INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '新闻时事', @l1_culture, 2, 30
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = '新闻时事' AND parent_id = @l1_culture AND level = 2
);
SELECT id INTO @l2_culture_3 FROM themes WHERE name = '新闻时事' AND parent_id = @l1_culture AND level = 2 ORDER BY id DESC LIMIT 1;
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '经济新闻', @l2_culture_3, 3, 10 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '经济新闻' AND parent_id = @l2_culture_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '科技新闻', @l2_culture_3, 3, 20 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '科技新闻' AND parent_id = @l2_culture_3 AND level = 3);
INSERT INTO themes (name, parent_id, level, sort_order)
SELECT '国际关系', @l2_culture_3, 3, 30 WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = '国际关系' AND parent_id = @l2_culture_3 AND level = 3);

COMMIT;
