import bg from "./components/bg.png";

export default function Loading() {
	return (
		<div
			className="w-screen h-screen bg-black-100"
			style={{
				backgroundImage: `url(${bg.src})`,
				backgroundPositionX: "center",
				backgroundPositionY: "center",
				backgroundSize: "cover",
			}}
		/>
	);
}
