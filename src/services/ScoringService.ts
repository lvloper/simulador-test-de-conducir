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
 * Returns the set of question IDs where the last answer was incorrect.
 */
export function getErrorQuestionIds(): Set<string> {
    const data = loadScoring();
    const ids = new Set<string>();
    for (const [id, record] of Object.entries(data)) {
        if (!record.lastCorrect) {
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
 * Adds jitter within tiers to maintain some randomness.
 */
export function sortByPriority(questions: NumeredQuestion[]): NumeredQuestion[] {
    const data = loadScoring();

    const getWeight = (q: NumeredQuestion): number => {
        const id = getQuestionId(q);
        const record = data[id];
        if (!record) return 0; // never answered → neutral

        const total = record.timesCorrect + record.timesIncorrect;
        if (total === 0) return 0;

        const errorRatio = record.timesIncorrect / total; // 0..1

        if (record.timesIncorrect > 0) {
            // Has errors: base weight 100 + scaled by error ratio
            // More errors → higher weight → appears first
            return 100 + errorRatio * 100;
        }

        // All correct: push to the back, more correct = further back
        return -record.timesCorrect;
    };

    // Add small jitter for randomness within same-weight groups
    const jitter = new Map<NumeredQuestion, number>();
    for (const q of questions) {
        jitter.set(q, Math.random() * 10);
    }

    questions.sort((a, b) => {
        const wA = getWeight(a) + (jitter.get(a) ?? 0);
        const wB = getWeight(b) + (jitter.get(b) ?? 0);
        return wB - wA;
    });

    return questions;
}

/**
 * Muestreo ponderado sin reemplazo (Weighted Random Sampling).
 *
 * OBJETIVO: que las preguntas con errores tengan MAYOR PROBABILIDAD de
 * aparecer dentro de las N preguntas del examen, pero que una vez seleccionadas
 * queden en posición ALEATORIA (no siempre primero).
 *
 * CÓMO FUNCIONA — sistema de "boletos":
 *   - Con errores:       2 a 5 boletos según ratio de error
 *                        (más errores = más boletos = más chances de entrar)
 *   - Nunca respondida:  1 boleto  (probabilidad base)
 *   - Siempre correcta:  0.1 a 1 boleto, decrece cuantas más veces se acertó
 *
 * En cada paso se hace un sorteo aleatorio ponderado sobre el pool restante,
 * se extrae la ganadora y se repite hasta completar las N preguntas.
 * Finalmente se baraja el resultado → los errores aparecen en posición
 * aleatoria dentro del examen, no siempre primero.
 */
export function weightedSelectQuestions(
    questions: NumeredQuestion[],
    limit: number
): NumeredQuestion[] {
    const data = loadScoring();

    const getTickets = (q: NumeredQuestion): number => {
        const id = getQuestionId(q);
        const record = data[id];
        if (!record) return 1; // nunca respondida → probabilidad base

        const total = record.timesCorrect + record.timesIncorrect;
        if (total === 0) return 1;

        if (record.timesIncorrect > 0) {
            // Con errores: 2..5 tickets según ratio de error
            const errorRatio = record.timesIncorrect / total;
            return 2 + errorRatio * 3;
        }

        // Solo correctas: menos tickets cuantas más veces acertó
        return Math.max(0.1, 1 - record.timesCorrect * 0.15);
    };

    const n = Math.min(limit, questions.length);
    const pool = questions.map(q => ({ q, tickets: getTickets(q) }));
    const selected: NumeredQuestion[] = [];

    while (selected.length < n && pool.length > 0) {
        const totalWeight = pool.reduce((sum, item) => sum + item.tickets, 0);
        let rand = Math.random() * totalWeight;

        for (let i = 0; i < pool.length; i++) {
            rand -= pool[i].tickets;
            if (rand <= 0) {
                selected.push(pool[i].q);
                pool.splice(i, 1);
                break;
            }
        }
    }

    // Barajar el resultado: las preguntas priorizadas deben aparecer
    // en posición aleatoria dentro del examen, no siempre primero
    for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    return selected;
}
