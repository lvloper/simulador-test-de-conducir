import { useState, useMemo } from "react";
import { AnswerRecord, getAllAnswered, clearScoring, computeWeight } from "../services/ScoringService";

type Filter = "all" | "errors" | "correct";

export const MyAnswersPanel: React.FC<{ onPracticeErrors?: () => void }> = ({ onPracticeErrors }) => {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<Filter>("all");
    const [, setRefresh] = useState(0);

    const data = getAllAnswered();
    const totalAnswered = Object.keys(data).length;

    const entries = useMemo(() => {
        let items = Object.entries(data);

        if (filter === "errors") {
            items = items.filter(([, r]) => r.timesIncorrect > 0);
        } else if (filter === "correct") {
            items = items.filter(([, r]) => r.timesCorrect > 0 && r.timesIncorrect === 0);
        }

        // Sort: most errors first
        items.sort(([, a], [, b]) => {
            const wA = a.timesIncorrect - a.timesCorrect;
            const wB = b.timesIncorrect - b.timesCorrect;
            return wB - wA;
        });

        return items;
    }, [data, filter]);

    const errorCount = Object.values(data).filter((r) => r.timesIncorrect > 0).length;
    const hasErrors = errorCount > 0;

    const handleClear = () => {
        if (window.confirm("¿Borrar todo el historial de respuestas?")) {
            clearScoring();
            setRefresh((n) => n + 1);
        }
    };

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    position: "fixed",
                    top: 12,
                    right: 12,
                    zIndex: 1000,
                    backgroundColor: "#007BC7",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.85em",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                }}
            >
                📋 Mis Respuestas
                {totalAnswered > 0 && (
                    <span
                        style={{
                            backgroundColor: "#FAD704",
                            color: "#333",
                            borderRadius: "50%",
                            width: 24,
                            height: 24,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8em",
                            fontWeight: "bold",
                        }}
                    >
                        {totalAnswered}
                    </span>
                )}
            </button>

            {/* Panel overlay */}
            {open && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: "100%",
                        maxWidth: 480,
                        zIndex: 1001,
                        backgroundColor: "white",
                        boxShadow: "-4px 0 20px rgba(0,0,0,0.2)",
                        display: "flex",
                        flexDirection: "column",
                        overflowY: "auto",
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px 20px",
                            borderBottom: "2px solid #007BC7",
                            backgroundColor: "#f8f9fa",
                            position: "sticky",
                            top: 0,
                            zIndex: 1,
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: "1.1em" }}>
                            📋 Mis Respuestas ({totalAnswered})
                        </h3>
                        <button
                            onClick={() => setOpen(false)}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "1.5em",
                                cursor: "pointer",
                                color: "#666",
                                lineHeight: 1,
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Filters */}
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            padding: "12px 20px",
                            borderBottom: "1px solid #eee",
                            flexWrap: "wrap",
                            alignItems: "center",
                        }}
                    >
                        <FilterButton
                            active={filter === "all"}
                            onClick={() => setFilter("all")}
                            label="Todas"
                        />
                        <FilterButton
                            active={filter === "errors"}
                            onClick={() => setFilter("errors")}
                            label="❌ Con errores"
                        />
                        <FilterButton
                            active={filter === "correct"}
                            onClick={() => setFilter("correct")}
                            label="✅ Solo aciertos"
                        />
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={handleClear}
                            style={{
                                background: "none",
                                border: "1px solid #dc3545",
                                color: "#dc3545",
                                borderRadius: 4,
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontSize: "0.8em",
                            }}
                        >
                            🗑 Limpiar
                        </button>
                    </div>

                    {/* Practice errors button */}
                    {hasErrors && onPracticeErrors && (
                        <div
                            style={{
                                padding: "12px 20px",
                                borderBottom: "1px solid #eee",
                            }}
                        >
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    onPracticeErrors();
                                }}
                                style={{
                                    width: "100%",
                                    padding: "10px 16px",
                                    backgroundColor: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "0.95em",
                                    boxShadow: "0 2px 6px rgba(220,53,69,0.3)",
                                }}
                            >
                                🔁 Practicar solo mis errores ({errorCount})
                            </button>
                        </div>
                    )}

                    {/* List */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
                        {entries.length === 0 && (
                            <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>
                                {totalAnswered === 0
                                    ? "Aún no has respondido ninguna pregunta."
                                    : "No hay preguntas con este filtro."}
                            </p>
                        )}

                        {entries.map(([id, record]) => (
                            <AnswerCard key={id} id={id} record={record} />
                        ))}
                    </div>
                </div>
            )}

            {/* Backdrop */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.3)",
                        zIndex: 1000,
                    }}
                />
            )}
        </>
    );
};

const FilterButton: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
}> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        style={{
            padding: "4px 12px",
            borderRadius: 4,
            border: "1px solid #ccc",
            backgroundColor: active ? "#007BC7" : "white",
            color: active ? "white" : "#333",
            cursor: "pointer",
            fontSize: "0.85em",
            fontWeight: active ? "bold" : "normal",
        }}
    >
        {label}
    </button>
);

const WeightBadge: React.FC<{ record: AnswerRecord }> = ({ record }) => {
    const weight = computeWeight(record);
    const percent = Math.round(Math.abs(weight) * 100);

    if (weight > 0) {
        return (
            <span
                style={{
                    backgroundColor: "rgba(220,53,69,0.12)",
                    color: "#dc3545",
                    padding: "2px 7px",
                    borderRadius: 4,
                    fontSize: "0.75em",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                }}
                title="Mayor probabilidad de aparecer con refuerzo inteligente"
            >
                ↑ +{percent}% prioridad
            </span>
        );
    } else if (weight < 0) {
        return (
            <span
                style={{
                    backgroundColor: "rgba(40,167,69,0.12)",
                    color: "#28a745",
                    padding: "2px 7px",
                    borderRadius: 4,
                    fontSize: "0.75em",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                }}
                title="Menor probabilidad de aparecer con refuerzo inteligente"
            >
                ↓ -{percent}% prioridad
            </span>
        );
    }
    return (
        <span
            style={{
                backgroundColor: "rgba(0,0,0,0.06)",
                color: "#999",
                padding: "2px 7px",
                borderRadius: 4,
                fontSize: "0.75em",
                whiteSpace: "nowrap",
            }}
            title="Prioridad neutral"
        >
            = neutral
        </span>
    );
};

const AnswerCard: React.FC<{ id: string; record: AnswerRecord }> = ({
    record,
}) => {
    const [expanded, setExpanded] = useState(false);
    const hasErrors = record.timesIncorrect > 0;
    const allCorrect = record.timesIncorrect === 0 && record.timesCorrect > 0;

    return (
        <div
            style={{
                borderLeft: `4px solid ${hasErrors ? "#dc3545" : "#28a745"}`,
                margin: "10px 0",
                padding: "10px 14px",
                backgroundColor: hasErrors ? "#fff5f5" : "#f0fff4",
                borderRadius: "0 6px 6px 0",
                cursor: "pointer",
                textAlign: "left",
            }}
            onClick={() => setExpanded(!expanded)}
        >
            {/* Question text */}
            <div
                style={{
                    fontSize: "0.9em",
                    color: "#333",
                    lineHeight: 1.4,
                    overflow: expanded ? "visible" : "hidden",
                    textOverflow: expanded ? "unset" : "ellipsis",
                    whiteSpace: expanded ? "normal" : "nowrap",
                    maxWidth: "100%",
                }}
            >
                {record.questionText}
            </div>

            {/* Stats row */}
            <div
                style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 6,
                    fontSize: "0.8em",
                    color: "#666",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <span style={{ color: "#28a745", fontWeight: "bold" }}>
                    ✓ {record.timesCorrect}
                </span>
                <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                    ✗ {record.timesIncorrect}
                </span>
                <span>
                    Última:{" "}
                    {record.lastCorrect ? (
                        <span style={{ color: "#28a745" }}>✓ Correcta</span>
                    ) : (
                        <span style={{ color: "#dc3545" }}>✗ Incorrecta</span>
                    )}
                </span>
                {allCorrect && <span>⭐</span>}
                <WeightBadge record={record} />
            </div>

            {/* Expanded details */}
            {expanded && (
                <div style={{ marginTop: 10 }}>
                    {/* Options */}
                    <div style={{ fontSize: "0.82em", marginBottom: 8 }}>
                        {record.options.map((opt, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: "3px 8px",
                                    margin: "2px 0",
                                    borderRadius: 3,
                                    backgroundColor:
                                        i === record.correctIndex
                                            ? "rgba(40,167,69,0.15)"
                                            : i === record.lastAnswer && !record.lastCorrect
                                            ? "rgba(220,53,69,0.15)"
                                            : "transparent",
                                    color:
                                        i === record.correctIndex
                                            ? "#28a745"
                                            : i === record.lastAnswer && !record.lastCorrect
                                            ? "#dc3545"
                                            : "#555",
                                    fontWeight: i === record.correctIndex ? "bold" : "normal",
                                }}
                            >
                                {i === record.correctIndex && "✓ "}
                                {i === record.lastAnswer &&
                                    !record.lastCorrect &&
                                    "✗ "}
                                {opt}
                            </div>
                        ))}
                    </div>

                    {/* Source */}
                    <div
                        style={{
                            fontSize: "0.75em",
                            color: "#999",
                            borderTop: "1px solid #eee",
                            paddingTop: 6,
                        }}
                    >
                        Fuente #{record.sourceIndex + 1}:{" "}
                        {record.sourceLink ? (
                            <a
                                href={record.sourceLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#007BC7" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {record.sourceName}
                            </a>
                        ) : (
                            record.sourceName
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
