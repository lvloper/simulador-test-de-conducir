import { NumeredQuestion } from "../providers/QuestionProvider";
import { saveAnswer, sortByPriority } from "../services/ScoringService";

function makeQuestion(id: number, text: string): NumeredQuestion {
    return {
        text,
        options: ["A", "B", "C"],
        correctIndex: 0,
        number: id,
        numberInProvider: id,
        source: { name: "test", index: 0 },
    };
}

beforeEach(() => {
    localStorage.clear();
});

describe("sortByPriority", () => {

    test("prioriza preguntas respondidas mal (última o recurrentemente)", () => {
        const qMal = makeQuestion(0, "Respondida mal");
        const qBien = makeQuestion(1, "Respondida bien");
        const qNunca = makeQuestion(2, "Nunca respondida");

        saveAnswer(qMal, 1, false);
        saveAnswer(qBien, 0, true);

        const questions = [qBien, qNunca, qMal];
        sortByPriority(questions);

        // La respondida mal debe quedar antes que las demás
        expect(questions[0].text).toBe("Respondida mal");
    });

    test("empuja al final las preguntas respondidas bien recurrentemente", () => {
        const qSiempre = makeQuestion(0, "Siempre bien");
        const qNunca = makeQuestion(1, "Nunca respondida");

        saveAnswer(qSiempre, 0, true);
        saveAnswer(qSiempre, 0, true);
        saveAnswer(qSiempre, 0, true);

        const questions = [qSiempre, qNunca];
        sortByPriority(questions);

        // La nunca respondida (neutral) debe ir antes que la dominada
        expect(questions[0].text).toBe("Nunca respondida");
        expect(questions[1].text).toBe("Siempre bien");
    });

});
