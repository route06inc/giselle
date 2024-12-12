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
		const lf = new Langfuse({
			publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
			secretKey: process.env.NEXT_PUBLIC_LANGFUSE_SECRET_KEY,
			baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_BASEURL,
		});
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
			<form>
			<label>
				<input
					type="radio"
					value="4"
					checked={selectedOption === "4"}
					onChange={(event) => {
						setSelectedOption(event.target.value);
					}}
				/>
				😊
			</label>
			<label>
				<input
					type="radio"
					value="3"
					checked={selectedOption === "3"}
					onChange={(event) => {
						setSelectedOption(event.target.value);
					}}
				/>
				😐️
			</label>
			<label>
				<input
					type="radio"
					value="2"
					checked={selectedOption === "2"}
					onChange={(event) => {
						setSelectedOption(event.target.value);
					}}
				/>
				😑
			</label>
			<label>
				<input
					type="radio"
					value="1"
					checked={selectedOption === "1"}
					onChange={(event) => {
						setSelectedOption(event.target.value);
					}}
				/>
				😢
			</label>
			<br />
			<div className="grid gap-[8px] pb-[14px]">
				<textarea
					className="w-full text-[14px] h-[200px] bg-[hsla(222,21%,40%,0.3)] rounded-[8px] text-white p-[14px] font-rosart outline-none resize-none"
					value={feedbackComment}
					onChange={(event) => {
						setFeedbackComment(event.target.value);
					}}
				/>
			</div>
			<br />
			<button
				type="button"
				className="relative z-10 rounded-[8px] shadow-[0px_0px_3px_0px_#FFFFFF40_inset] py-[4px] px-[8px] bg-black-80 text-black-30 font-rosart text-[14px] disabled:bg-black-40"
				onClick={submit}
			>
				Submit
			</button>
			</form>
		</div>
	);
};
