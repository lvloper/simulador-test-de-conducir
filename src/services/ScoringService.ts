import { NumeredQuestion } from "../providers/QuestionProvider";

export type AnswerRecord = {
    timesCorrect: number;
    timesIncorrect: number;
    lastAnswer: number;
    lastCorrect: boolean;
    questionText: string;
    correctIndex: number;
    options: string[];
    sourceName: string;
    sourceLink?: string;
    sourceIndex: number;
    lastAttempt: number;
};

type ScoringData = Record<string, AnswerRecord>;

const STORAGE_KEY = "scoring";

function getQuestionId(question: NumeredQuestion): string {
    return `${question.source.index}-${question.numberInProvider}`;
}

function loadScoring(): ScoringData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch {
        // corrupted data
    }
    return {};
}

function persistScoring(data: ScoringData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveAnswer(
    question: NumeredQuestion,
    answerIndex: number,
    wasCorrect: boolean
): void {
    const data = loadScoring();
    const id = getQuestionId(question);
    const existing = data[id];

    data[id] = {
        timesCorrect: (existing?.timesCorrect ?? 0) + (wasCorrect ? 1 : 0),
        timesIncorrect: (existing?.timesIncorrect ?? 0) + (wasCorrect ? 0 : 1),
        lastAnswer: answerIndex,
        lastCorrect: wasCorrect,
        questionText: question.text,
        correctIndex: question.correctIndex,
        options: question.options,
        sourceName: question.source.name,
        sourceLink: question.source.link,
        sourceIndex: question.source.index ?? 0,
        lastAttempt: Date.now(),
    };

    persistScoring(data);
}

export function getAllAnswered(): ScoringData {
    return loadScoring();
}

export function clearScoring(): void {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Compute the priority weight from an AnswerRecord.
 * Range: -1 (all correct) to +1 (all incorrect). 0 = neutral.
 */
export function computeWeight(record: AnswerRecord): number {
    const total = record.timesCorrect + record.timesIncorrect;
    if (total === 0) return 0;
    return (record.timesIncorrect - record.timesCorrect) / total;
}

/**
 * Returns the set of question IDs that have at least one error.
 */
export function getErrorQuestionIds(): Set<string> {
    const data = loadScoring();
    const ids = new Set<string>();
    for (const [id, record] of Object.entries(data)) {
        if (record.timesIncorrect > 0) {
            ids.add(id);
        }
    }
    return ids;
}

/**
 * Returns a priority weight for sorting.
 * Higher weight = more errors = should appear first.
 * Questions never answered get weight 0 (neutral).
 */
export function getQuestionWeight(question: NumeredQuestion): number {
    const data = loadScoring();
    const id = getQuestionId(question);
    const record = data[id];

    if (!record) return 0; // never answered

    const total = record.timesCorrect + record.timesIncorrect;
    if (total === 0) return 0;

    // Range: -1 (all correct) to +1 (all incorrect)
    return (record.timesIncorrect - record.timesCorrect) / total;
}

/**
 * Given an array of questions, sort them so that questions
 * with more errors come first, then never-answered, then well-answered.
 * Uses Fisher-Yates within each tier to maintain randomness.
 */
export function sortByPriority(questions: NumeredQuestion[]): NumeredQuestion[] {
    const data = loadScoring();

    const getWeight = (q: NumeredQuestion): number => {
        const id = getQuestionId(q);
        const record = data[id];
        if (!record) return 0;
        const total = record.timesCorrect + record.timesIncorrect;
        if (total === 0) return 0;
        return (record.timesIncorrect - record.timesCorrect) / total;
    };

    // Sort descending by weight (more errors first)
    questions.sort((a, b) => getWeight(b) - getWeight(a));

    return questions;
}
