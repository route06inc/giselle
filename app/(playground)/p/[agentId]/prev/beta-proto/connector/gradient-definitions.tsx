export const GradientPathDefinitions = () => (
	<svg className="h-0">
		<title>Gradient Definition</title>
		<defs>
			<linearGradient
				id="instructionToAction"
				x1="0%"
				y1="0%"
				x2="100%"
				y2="0%"
			>
				<stop offset="0%" stopColor="#FFFBF7" />
				<stop offset="100%" stopColor="#24BED2" />
			</linearGradient>
			<linearGradient id="actionToAction" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor="#24BED2" />
				<stop offset="100%" stopColor="#24BED2" />
			</linearGradient>
		</defs>
	</svg>
);
