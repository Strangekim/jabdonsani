(function (root) {
  "use strict";

  const questionnaire = root.QUESTIONNAIRE;
  if (!questionnaire || !Array.isArray(questionnaire.items)) {
    throw new Error("Questionnaire data must be loaded before the scoring engine.");
  }

  const items = questionnaire.items;
  const metadata = questionnaire.functions;
  const codes = metadata.map(function (item) { return item.code; });
  const hasOwn = function (object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  };
  const isAnswer = function (value) {
    return Number.isInteger(value) && value >= 1 && value <= 5;
  };

  function validateQuestionnaire() {
    if (items.length !== 64 || codes.length !== 8 || new Set(codes).size !== 8) {
      throw new Error("The questionnaire requires 64 items and 8 distinct functions.");
    }
    if (new Set(items.map(function (item) { return item.q; })).size !== 64 ||
        new Set(items.map(function (item) { return item.id; })).size !== 64) {
      throw new Error("Duplicate questionnaire number or item identifier.");
    }
    items.forEach(function (item, index) {
      if (item.q !== index + 1 || !codes.includes(item.function) ||
          typeof item.reverse !== "boolean" || typeof item.text !== "string" || !item.text.trim()) {
        throw new Error("Invalid questionnaire item at position " + (index + 1));
      }
    });
    codes.forEach(function (code) {
      const subset = items.filter(function (item) { return item.function === code; });
      if (subset.length !== 8 || subset.filter(function (item) { return item.reverse; }).length !== 2) {
        throw new Error("Each function requires 6 direct and 2 reverse-keyed items: " + code);
      }
    });
    return true;
  }

  validateQuestionnaire();

  function normalizeAnswers(answers) {
    if (answers === null || typeof answers !== "object" || Array.isArray(answers)) {
      return {};
    }
    return answers;
  }

  function answeredItems(answers) {
    const input = normalizeAnswers(answers);
    return items.filter(function (item) {
      return hasOwn(input, item.q) && isAnswer(input[item.q]);
    });
  }

  function responseCount(answers) {
    return answeredItems(answers).length;
  }

  function isComplete(answers) {
    return responseCount(answers) === items.length;
  }

  function score(answers) {
    const input = normalizeAnswers(answers);
    const missing = [];
    const invalid = [];
    const responses = items.map(function (item) {
      const present = hasOwn(input, item.q);
      const valid = present && isAnswer(input[item.q]);
      if (!valid) missing.push(item.q);
      if (present && !valid) invalid.push(item.q);
      return {
        q: item.q,
        id: item.id,
        function: item.function,
        text: item.text,
        reverse: item.reverse,
        response: valid ? input[item.q] : null,
        adjusted: valid ? (item.reverse ? 6 - input[item.q] : input[item.q]) : null
      };
    });
    const functions = metadata.map(function (meta) {
      const subset = responses.filter(function (item) { return item.function === meta.code; });
      const valid = subset.filter(function (item) { return item.response !== null; });
      const complete = valid.length === subset.length;
      const total = complete ? valid.reduce(function (sum, item) { return sum + item.adjusted; }, 0) : null;
      const mean = complete ? total / subset.length : null;
      const evidence = valid.slice().sort(function (a, b) {
        return Math.abs(b.adjusted - 3) - Math.abs(a.adjusted - 3) || a.q - b.q;
      }).slice(0, 2).map(function (item) {
        return Object.assign({}, item, {
          responseLabel: questionnaire.scale[item.response - 1].label
        });
      });
      return Object.assign({}, meta, {
        answered: valid.length,
        count: subset.length,
        complete: complete,
        total: total,
        mean: mean,
        displayMean: mean === null ? null : mean.toFixed(2),
        evidence: evidence
      });
    });
    const byFunction = {};
    functions.forEach(function (entry) { byFunction[entry.code] = entry; });
    const knownKeys = new Set(items.map(function (item) { return String(item.q); }));
    return {
      version: questionnaire.version,
      complete: missing.length === 0,
      answered: items.length - missing.length,
      total: items.length,
      missing: missing,
      invalid: invalid,
      ignoredKeys: Object.keys(input).filter(function (key) { return !knownKeys.has(key); }),
      functions: functions,
      byFunction: byFunction,
      responses: responses
    };
  }

  // 가중치는 공식 MBTI 채점법이 아닌 이 앱의 자체 규칙입니다.
  const typeMethod = "dominant-auxiliary-2to1-v1";
  const typeProfiles = [
    { code: "ISTJ", dominant: "Si", auxiliary: "Te", description: "익숙한 경험을 참고하고, 원하는 결과에 맞춰 방법을 정하는 모습과 가까워요." },
    { code: "ISFJ", dominant: "Si", auxiliary: "Fe", description: "익숙한 경험을 참고하고, 사람들 사이의 반응을 살피는 모습과 가까워요." },
    { code: "INFJ", dominant: "Ni", auxiliary: "Fe", description: "여러 일의 공통된 흐름을 짚고, 사람들 사이의 반응을 살피는 모습과 가까워요." },
    { code: "INTJ", dominant: "Ni", auxiliary: "Te", description: "앞으로 이어질 흐름을 생각하고, 원하는 결과에 맞춰 방법을 정하는 모습과 가까워요." },
    { code: "ISTP", dominant: "Ti", auxiliary: "Se", description: "설명이 앞뒤로 맞는지 따져 보고, 지금 확인할 수 있는 정보를 참고하는 모습과 가까워요." },
    { code: "ISFP", dominant: "Fi", auxiliary: "Se", description: "자신에게 중요한 기준을 생각하고, 지금 직접 느끼는 정보를 참고하는 모습과 가까워요." },
    { code: "INFP", dominant: "Fi", auxiliary: "Ne", description: "자신에게 중요한 기준을 생각하고, 여러 가능성을 떠올리는 모습과 가까워요." },
    { code: "INTP", dominant: "Ti", auxiliary: "Ne", description: "설명이 앞뒤로 맞는지 따져 보고, 다른 가능성도 연결해 보는 모습과 가까워요." },
    { code: "ESTP", dominant: "Se", auxiliary: "Ti", description: "지금 직접 확인한 정보를 살피고, 그 정보가 어떻게 맞물리는지 생각하는 모습과 가까워요." },
    { code: "ESFP", dominant: "Se", auxiliary: "Fi", description: "지금 직접 느끼는 정보를 살피고, 자신에게 무엇이 중요한지 생각하는 모습과 가까워요." },
    { code: "ENFP", dominant: "Ne", auxiliary: "Fi", description: "다양한 가능성을 떠올리고, 자신에게 무엇이 중요한지 생각하는 모습과 가까워요." },
    { code: "ENTP", dominant: "Ne", auxiliary: "Ti", description: "다양한 가능성을 떠올리고, 각각의 설명이 앞뒤로 맞는지 살피는 모습과 가까워요." },
    { code: "ESTJ", dominant: "Te", auxiliary: "Si", description: "원하는 결과에 맞춰 방법을 고르고, 이전에 해 본 경험을 참고하는 모습과 가까워요." },
    { code: "ESFJ", dominant: "Fe", auxiliary: "Si", description: "사람들 사이의 반응을 살피고, 이전에 해 본 경험을 참고하는 모습과 가까워요." },
    { code: "ENFJ", dominant: "Fe", auxiliary: "Ni", description: "사람들 사이의 반응을 살피고, 앞으로 이어질 흐름을 생각하는 모습과 가까워요." },
    { code: "ENTJ", dominant: "Te", auxiliary: "Ni", description: "원하는 결과에 맞춰 방법을 고르고, 앞으로 이어질 흐름을 생각하는 모습과 가까워요." }
  ];
  const tieQuestions = [
    {
      dimension: "EI", index: 0,
      prompt: "생각이 아직 정리되지 않았을 때, 더 편한 쪽은?",
      options: [
        { value: "E", text: "대화를 나누면서 생각을 정리한다." },
        { value: "I", text: "혼자 생각을 정리한 뒤 대화를 나눈다." }
      ]
    },
    {
      dimension: "SN", index: 1,
      prompt: "처음 듣는 설명에서 먼저 알고 싶은 것은?",
      options: [
        { value: "S", text: "실제 사례에서는 어떻게 되는지." },
        { value: "N", text: "다른 상황으로 어떻게 이어질 수 있는지." }
      ]
    },
    {
      dimension: "TF", index: 2,
      prompt: "의견이 갈렸을 때, 먼저 살펴보는 것은?",
      options: [
        { value: "T", text: "서로 같은 기준을 적용했는지." },
        { value: "F", text: "서로 무엇을 중요하게 여기는지." }
      ]
    },
    {
      dimension: "JP", index: 3,
      prompt: "할 일을 정할 때, 더 편한 쪽은?",
      options: [
        { value: "J", text: "일단 방향을 정하고, 필요하면 바꾼다." },
        { value: "P", text: "몇 가지 방향을 열어 두고, 하면서 정한다." }
      ]
    }
  ];

  function estimateType(answers, tieAnswers = {}) {
    const scored = score(answers);
    const result = {
      complete: scored.complete,
      answered: scored.answered,
      total: scored.total,
      missing: scored.missing.slice(),
      invalid: scored.invalid.slice(),
      resolved: false,
      type: null,
      selected: null,
      ranking: [],
      initialCandidates: [],
      candidates: [],
      tieUsed: [],
      nextTie: null,
      nearCandidates: [],
      method: typeMethod
    };
    if (!scored.complete) return result;

    result.ranking = typeProfiles.map(function (profile) {
      return Object.assign({}, profile, {
        rawScore: 2 * scored.byFunction[profile.dominant].total + scored.byFunction[profile.auxiliary].total
      });
    }).sort(function (a, b) {
      // 두 번째 정렬 기준은 표시 순서에만 사용하며, 동점 유형을 자동으로 선택하지 않습니다.
      return b.rawScore - a.rawScore || (a.code < b.code ? -1 : (a.code > b.code ? 1 : 0));
    });
    const highestScore = result.ranking[0].rawScore;
    let remaining = result.ranking.filter(function (entry) { return entry.rawScore === highestScore; });
    result.initialCandidates = remaining.map(function (entry) { return entry.code; });
    const tieInput = normalizeAnswers(tieAnswers);
    function varies(question) {
      return new Set(remaining.map(function (entry) { return entry.code[question.index]; })).size === 2;
    }
    tieQuestions.forEach(function (question) {
      if (!varies(question) || !hasOwn(tieInput, question.dimension)) return;
      const choice = tieInput[question.dimension];
      if (!question.options.some(function (option) { return option.value === choice; })) return;
      remaining = remaining.filter(function (entry) { return entry.code[question.index] === choice; });
      result.tieUsed.push({ dimension: question.dimension, value: choice });
    });
    result.candidates = remaining.map(function (entry) { return entry.code; });
    result.resolved = remaining.length === 1;
    if (result.resolved) {
      result.selected = remaining[0];
      result.type = result.selected.code;
    } else {
      const question = tieQuestions.find(varies);
      if (question) {
        result.nextTie = {
          dimension: question.dimension,
          prompt: question.prompt,
          options: question.options.map(function (option) { return Object.assign({}, option); })
        };
      }
    }
    result.nearCandidates = result.ranking.filter(function (entry) {
      return entry.code !== result.type && highestScore - entry.rawScore <= 2;
    });
    return result;
  }

  function interpret(answers) {
    const result = score(answers);
    if (!result.complete) {
      return {
        complete: false,
        heading: "응답을 마치면 결과를 확인할 수 있어요",
        summary: result.answered + " / " + result.total + "문항에 응답했습니다.",
        functions: []
      };
    }
    return {
      complete: true,
      heading: "내가 먼저 참고하는 판단 기준",
      summary: "64개 응답을 8가지 정보 처리·판단 방식으로 정리했습니다. 점수는 이 문항들에 대한 응답 경향을 나타냅니다.",
      note: "기능별 문항에 동의하기 쉬운 정도는 다를 수 있습니다. 작은 점수 차이를 확실한 선호 차이로 보지 않습니다. 유형은 별도의 자체 규칙으로 추정하며, 기능 점수는 능력이나 발달 수준을 뜻하지 않습니다.",
      functions: result.functions.map(function (entry) {
        return {
          code: entry.code,
          name: entry.name,
          shortName: entry.shortName,
          scoreText: entry.displayMean + " / 5.00",
          description: entry.definition,
          summary: "이 방식에 해당하는 8개 문항의 정·역채점 환산 평균은 " + entry.displayMean + "점입니다.",
          reflection: entry.reflection,
          evidence: entry.evidence.map(function (item) {
            return {
              q: item.q,
              text: item.text,
              response: item.response,
              responseLabel: item.responseLabel,
              quote: "Q" + item.q + "에 “" + item.responseLabel + "”(" + item.response + "점)라고 응답했습니다."
            };
          })
        };
      })
    };
  }

  root.QuizEngine = Object.freeze({
    score: score,
    interpret: interpret,
    estimateType: estimateType,
    responseCount: responseCount,
    isComplete: isComplete,
    validateQuestionnaire: validateQuestionnaire
  });
})(typeof window !== "undefined" ? window : globalThis);
