import type { Poll } from "../../domain/types";

export function PostPoll(props: { poll: Poll; onVote?: (choice: number) => void }) {
  const totalVotes = props.poll.choices.reduce((sum, choice) => sum + choice.votes, 0);

  return (
    <div className="pollCard" onClick={(e) => e.stopPropagation()}>
      <div className="pollMeta">
        <span>{props.poll.multiple ? "Multiple choice" : "Single choice"}</span>
        <span>{totalVotes} vote{totalVotes === 1 ? "" : "s"}</span>
        {props.poll.expiresAt ? <span>Ends {new Date(props.poll.expiresAt).toLocaleString()}</span> : null}
      </div>
      <div className="pollChoices">
        {props.poll.choices.map((choice, index) => {
          const ratio = totalVotes > 0 ? Math.max(0, Math.min(100, (choice.votes / totalVotes) * 100)) : 0;
          return (
            <button
              key={`${choice.text}:${index}`}
              type="button"
              className={["pollChoice", choice.isVoted ? "pollChoiceVoted" : ""].join(" ")}
              onClick={() => props.onVote?.(index)}
              disabled={!props.onVote}
            >
              <span className="pollChoiceBar" style={{ width: `${ratio}%` }} />
              <span className="pollChoiceLabel">{choice.text}</span>
              <span className="pollChoiceVotes">
                {choice.votes}
                {choice.isVoted ? " ✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
