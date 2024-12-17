"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, UserPlus } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createTeam } from "../actions/create-team";

function Submit({
	selectedPlan,
	teamName,
}: { selectedPlan: string; teamName: string }) {
	const { pending } = useFormStatus();
	return (
		<Button
			type="submit"
			variant="default"
			className="transition-colors duration-200"
			disabled={pending || !teamName || !selectedPlan}
		>
			{selectedPlan === "pro" ? "Proceed to Payment" : "Create Team"}
		</Button>
	);
}

interface TeamCreationFormProps {
	canCreateFreeTeam: boolean;
	proPlanPrice: string;
}

export function TeamCreationForm({
	canCreateFreeTeam,
	proPlanPrice,
}: TeamCreationFormProps) {
	const [teamName, setTeamName] = useState("");
	const [selectedPlan, setSelectedPlan] = useState("");

	return (
		<Dialog>
			<DialogTrigger asChild>
				<UserPlus className="h-6 w-6 text-white hover:opacity-80" />
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px] bg-gray-950 text-gray-100">
				<DialogHeader>
					<DialogTitle className="text-2xl font-bold text-gray-100">
						Create New Team
					</DialogTitle>
				</DialogHeader>

				<form action={createTeam} className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="teamName" className="text-gray-200">
							Team Name
						</Label>
						<Input
							id="teamName"
							name="teamName"
							value={teamName}
							onChange={(e) => setTeamName(e.target.value)}
							className="bg-gray-900 border-gray-800 text-gray-100"
							placeholder="Enter team name"
						/>
					</div>
					<div className="space-y-4">
						<Label className="text-gray-200">Select Plan</Label>
						<RadioGroup
							name="selectedPlan"
							value={selectedPlan}
							onValueChange={setSelectedPlan}
							className="grid grid-cols-2 gap-4"
						>
							<Card
								className={`bg-gray-900 border-gray-800 ${
									canCreateFreeTeam ? "cursor-pointer" : "opacity-50"
								}`}
							>
								<label htmlFor="free">
									<CardHeader>
										<CardTitle className="text-gray-100">Free</CardTitle>
										<CardDescription className="text-gray-400">
											Basic features for small teams
										</CardDescription>
									</CardHeader>
									<CardContent>
										<RadioGroupItem
											value="free"
											id="free"
											disabled={!canCreateFreeTeam}
											className="text-blue-500"
										/>
										<Label htmlFor="free" className="ml-2 text-gray-300">
											$0/month
										</Label>
									</CardContent>
								</label>
							</Card>
							<Card className="bg-gray-900 border-gray-800 cursor-pointer">
								<label htmlFor="pro">
									<CardHeader>
										<CardTitle className="text-gray-100">Pro</CardTitle>
										<CardDescription className="text-gray-400">
											Advanced features & support
										</CardDescription>
									</CardHeader>
									<CardContent>
										<RadioGroupItem
											value="pro"
											id="pro"
											className="text-blue-500"
										/>
										<Label htmlFor="pro" className="ml-2 text-gray-300">
											{proPlanPrice}/month
										</Label>
									</CardContent>
								</label>
							</Card>
						</RadioGroup>
						{!canCreateFreeTeam && (
							<Alert
								variant="destructive"
								className="bg-red-900/20 border-red-900 text-red-400"
							>
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									You already have a Free plan team. Please upgrade to Pro for
									additional teams.
								</AlertDescription>
							</Alert>
						)}
					</div>
					<Submit selectedPlan={selectedPlan} teamName={teamName} />
				</form>
			</DialogContent>
		</Dialog>
	);
}
