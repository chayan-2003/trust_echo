'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { useRouter } from 'next/navigation';
interface Response {
    questions: string[];
    answers: string[];
}

export default function PainPointsPage({ params }: { params: Promise<{ formId: string }> }) {
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formId, setFormId] = useState<string | null>(null);
    const router = useRouter();
    useEffect(() => {
        const fetchFormId = async () => {
            try {
                const resolvedParams = await params;
                setFormId(resolvedParams.formId);
            } catch {
                setError('Failed to resolve form ID');
                setLoading(false);
            }
        };
        fetchFormId();
    }, [params]);

    useEffect(() => {
        const fetchAndProcessResponses = async () => {
            if (!formId) return;

            try {
                const responsesResponse = await fetch(`/api/forms/${formId}/responses`);
                if (!responsesResponse.ok) {
                    throw new Error('Failed to fetch responses');
                }

                const responsesData: Response[] = await responsesResponse.json();
                const combinedStrings = responsesData.map((response) =>
                    response.questions
                        .map((q, i) => `Q: ${q}\nA: ${response.answers[i] ?? 'N/A'}`)
                        .join('\n\n')
                );

                const geminiResponse = await fetch('/api/gemini/painpoints', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionsAndAnswers: combinedStrings }),
                });

                if (!geminiResponse.ok) {
                    throw new Error('Failed to process data with Gemini API');
                }

                const geminiResult = await geminiResponse.json();
                setResult(geminiResult.painPoints);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'An error occurred while processing responses');
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessResponses();
    }, [formId]);

    if (loading) {
        return <div className="text-center py-10 text-white">Loading responses...</div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">{error}</div>;
    }

    const painPoints = result
        ? result
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => {
                const match = line.match(/^\*\s*(.*?):\s*(.*)/);
                if (match) {
                    return {
                        title: match[1].trim(),
                        content: match[2].trim(),
                    };
                }
                return null;
            })
            .filter((point): point is { title: string; content: string } => point !== null)
        : [];
    painPoints.map((point => {
        point.title = point.title.slice(2);
        point.content = point.content.slice(2);
    }))

    if(painPoints.length === 0) {
        return (
            <div className="text-center py-10">
                <h1 className="text-2xl font-bold text-gray-800">No pain points noted as of now by the user.</h1>
            </div>
        );
    }
    return (
        <div>
            <div className="text-center text-3xl md:text-4xl font-bold text-gray-800 mt-8 mb-4">
                💡 Key Insights from User Feedback
            </div>
            <div className="text-center text-lg text-gray-500 mb-6">
                Subtly surfacing the challenges that matter most.
            </div>

            <div className="px-4 flex flex-col items-center gap-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl">
                    {painPoints?.map((point, index) => (
                        <motion.div
                            key={index}
                            className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                        >
                            <h3 className="text-xl font-semibold text-indigo-700 mb-2 text-center">{point.title}</h3>
                            <p className="text-gray-700">{point.content}</p>
                        </motion.div>
                    ))}
                </div>

                
            </div>

            <div className="mt-12 text-center" onClick={() => router.push(`/forms/${formId}/ai-analysis`)}>

                < motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold px-6 py-3 rounded-full shadow-md hover:shadow-lg transition duration-300"
                >
                    ⬅ Back to AI Analysis
                </motion.button>
            </div >
        </div >
    );
}
