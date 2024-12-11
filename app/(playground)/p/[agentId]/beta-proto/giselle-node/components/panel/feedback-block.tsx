import { Langfuse } from "langfuse";
import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export const FeedbackBlock = (props: { traceId: string }) => {
	const [selectedOption, setSelectedOption] = useState<string>("");
	const [feedbackComment, setFeedbackComment] = useState<string>("");

	const handleFeedbackCommentChange = (event) => {
		setFeedbackComment(event.target.value);
	};

	const submit = (e) => {
		e.preventDefault();
		const lf = new Langfuse();
		lf.score({
			traceId: props.traceId,
			name: "user_feedback",
			value: selectedOption || "",
			comment: feedbackComment,
		});
		setFeedbackComment("");
	};

	return (
		<div>
			<label>
				<input
					type="radio"
					value="5"
					checked={selectedOption === "5"}
					onChange={(event) => {
						setSelectedOption(event.target.value);
					}}
				/>
				😊
			</label>
			<label>
				<input
					type="radio"
					value="4"
					checked={selectedOption === "4"}
					onChange={(event) => {
						setSelectedOption(event.target.value);
					}}
				/>
				😢
			</label>
			<br />
			<div className="grid gap-[8px] pb-[14px]">
				<textarea
					value={feedbackComment}
					onChange={handleFeedbackCommentChange}
					className="w-full text-[14px] h-[200px] bg-[hsla(222,21%,40%,0.3)] rounded-[8px] text-white p-[14px] font-rosart outline-none resize-none"
				/>
			</div>
			<br />
			<button type="button" onClick={submit}>
				Submit
			</button>
		</div>
	);
};
