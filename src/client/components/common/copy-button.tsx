import { Button } from "@client/components/ui/button";
import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

export const CopyButton = ({
	textToCopy,
}: { textToCopy: string; children?: React.ReactNode }) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(textToCopy);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Button size="icon" variant="outline" onClick={handleCopy}>
			{copied ? (
				<CheckIcon className="size-4" />
			) : (
				<CopyIcon className="size-4" />
			)}
		</Button>
	);
};
