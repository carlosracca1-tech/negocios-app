"use client";

import { TimelineEvent } from "@/types";

interface TimelineProps {
  events: TimelineEvent[];
}

export default function Timeline({ events }: TimelineProps) {
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
        Timeline ({events.length})
      </div>

      {sortedEvents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-tertiary)" }}>
          Sin eventos registrados
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          {/* Vertical line */}
          <div style={{
            position: "absolute",
            left: 3,
            top: 0,
            bottom: 0,
            width: 1,
            background: "linear-gradient(180deg, rgba(56, 189, 248, 0.2), rgba(212, 165, 116, 0.1), transparent)",
          }} />

          {sortedEvents.map((event, i) => (
            <div key={event.id} style={{ marginBottom: 20, position: "relative" }}>
              {/* Dot */}
              <div
                style={{
                  position: "absolute",
                  left: -15,
                  top: 2,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--text-primary)",
                  border: "3px solid var(--surface-solid)",
                  boxShadow: "0 0 8px rgba(56, 189, 248, 0.35)",
                }}
              />

              {/* Content */}
              <div style={{ paddingTop: 0 }}>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>
                  {new Date(event.date).toLocaleDateString("es-AR")}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                  {event.action}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {event.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
