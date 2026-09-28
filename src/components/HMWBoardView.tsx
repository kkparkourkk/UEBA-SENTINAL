/**
 * HMW (How Might We) Collaborative Innovation Board
 * Pre-seeded with all 9 team HMW questions from:
 * - Shriram (Goals 4, 6, 8)
 * - Arshinth (Goals 5, 7, 9)
 * - Keshav (Goals 1, 3)
 * - Alfred (Goal 2)
 *
 * Supports filtering by Contributor, Theme, Status, upvoting,
 * proposing new questions, and jumping directly to the feature implementation in the console.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ThumbsUp,
  Filter,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Tag,
  Users,
  Compass,
  Lightbulb,
  X,
} from 'lucide-react';
import { HMWQuestionItem } from '../types';

interface HMWBoardViewProps {
  onNavigateToFeature: (view: 'unified' | 'oversight' | 'priority' | 'live' | 'posture') => void;
}

export const HMWBoardView: React.FC<HMWBoardViewProps> = ({ onNavigateToFeature }) => {
  const [questions, setQuestions] = useState<HMWQuestionItem[]>([]);
  const [selectedContributor, setSelectedContributor] = useState<string>('ALL');
  const [selectedTheme, setSelectedTheme] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New question form state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newContributor, setNewContributor] = useState('Shriram');
  const [newTheme, setNewTheme] = useState('Real-Time Threat Detection');
  const [newTargetGoal, setNewTargetGoal] = useState('Goal 6: Real-Time Detection');
  const [newSolutionSummary, setNewSolutionSummary] = useState('');

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/hmw');
      if (!res.ok) throw new Error('Failed to load HMW matrix');
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error('Error loading HMW questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleVote = async (id: string) => {
    try {
      const res = await fetch(`/api/hmw/${id}/vote`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, votes: data.question.votes } : q))
      );
    } catch (err) {
      console.error('Error voting on HMW question:', err);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    try {
      const res = await fetch('/api/hmw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestionText,
          contributor: newContributor,
          theme: newTheme,
          target_goal: newTargetGoal,
          solution_summary: newSolutionSummary || 'Under architectural evaluation.',
        }),
      });

      if (!res.ok) throw new Error('Failed to add HMW question');
      await fetchQuestions();
      setIsAddModalOpen(false);
      setNewQuestionText('');
      setNewSolutionSummary('');
    } catch (err) {
      console.error('Error creating question:', err);
    }
  };

  // Contributor styling badge
  const getContributorBadge = (contributor: string) => {
    switch (contributor) {
      case 'Shriram':
        return 'bg-amber-950/70 text-amber-300 border-amber-500/40';
      case 'Arshinth':
        return 'bg-purple-950/70 text-purple-300 border-purple-500/40';
      case 'Keshav':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
      case 'Alfred':
        return 'bg-blue-950/70 text-blue-300 border-blue-500/40';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  // Map target goal to appropriate view
  const mapGoalToView = (targetGoal: string): 'unified' | 'oversight' | 'priority' | 'live' | 'posture' => {
    if (targetGoal.includes('Goal 1')) return 'unified';
    if (targetGoal.includes('Goal 2')) return 'oversight';
    if (targetGoal.includes('Goal 3')) return 'priority';
    if (targetGoal.includes('Goal 4') || targetGoal.includes('Goal 6') || targetGoal.includes('Goal 7') || targetGoal.includes('Goal 8')) return 'live';
    if (targetGoal.includes('Goal 5') || targetGoal.includes('Goal 9')) return 'posture';
    return 'unified';
  };

  // Unique lists for filtering
  const contributors = ['ALL', 'Shriram', 'Arshinth', 'Keshav', 'Alfred'];
  const themes = ['ALL', ...Array.from(new Set(questions.map((q) => q.theme)))];

  const filteredQuestions = questions.filter((q) => {
    if (selectedContributor !== 'ALL' && q.contributor !== selectedContributor) return false;
    if (selectedTheme !== 'ALL' && q.theme !== selectedTheme) return false;
    if (selectedStatus !== 'ALL' && q.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-gradient-to-r from-purple-950/20 via-neutral-900/60 to-neutral-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold">
            <Lightbulb className="h-4 w-4" />
            Design Thinking Artifact
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            How Might We (HMW) Collaborative Matrix
          </h2>
          <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
            Pre-seeded with all 9 design thinking questions contributed by <strong>Shriram, Arshinth, Keshav, and Alfred</strong>. Documents who raised which question, the underlying design goal, and the concrete architecture solution implemented in UEBA Sentinel.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/40 transition flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          Propose HMW Question
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-wrap items-center justify-between gap-4">
        {/* Contributor Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono text-neutral-400 mr-2 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Contributor:
          </span>
          {contributors.map((contrib) => (
            <button
              key={contrib}
              onClick={() => setSelectedContributor(contrib)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition ${
                selectedContributor === contrib
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {contrib === 'ALL' ? 'All Team (9)' : contrib}
            </button>
          ))}
        </div>

        {/* Theme Select */}
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Filter className="h-3.5 w-3.5" />
          <span>Theme:</span>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:border-purple-500 text-xs"
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredQuestions.map((q) => {
          const targetView = mapGoalToView(q.target_goal);
          return (
            <div
              key={q.id}
              className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header row: ID, Contributor, Votes */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-400">{q.id}</span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${getContributorBadge(
                        q.contributor
                      )}`}
                    >
                      {q.contributor}
                    </span>
                  </div>

                  <button
                    onClick={() => handleVote(q.id)}
                    className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition hover:text-purple-300"
                    title="Upvote this design question"
                  >
                    <ThumbsUp className="h-3 w-3 text-purple-400" />
                    <span>{q.votes}</span>
                  </button>
                </div>

                {/* Target Goal Pill */}
                <div className="text-[11px] font-mono text-purple-400 font-semibold flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {q.target_goal}
                </div>

                {/* Question Text */}
                <h3 className="text-sm font-bold text-white group-hover:text-purple-200 transition leading-snug">
                  "{q.question}"
                </h3>

                {/* Theme badge */}
                <div className="text-[10px] font-mono text-neutral-500">
                  Theme: <span className="text-neutral-400">{q.theme}</span>
                </div>

                {/* Solution Summary */}
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-1">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Implemented Solution
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {q.solution_summary}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">
                  Status: <span className="text-emerald-400 font-semibold">{q.status}</span>
                </span>

                <button
                  onClick={() => onNavigateToFeature(targetView)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition group-hover:underline"
                >
                  Inspect Feature
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Propose New HMW Question */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Propose New HMW Question</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  How Might We Question:
                </label>
                <textarea
                  required
                  rows={3}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="How might we..."
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Contributor:</label>
                  <select
                    value={newContributor}
                    onChange={(e) => setNewContributor(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="Shriram">Shriram</option>
                    <option value="Arshinth">Arshinth</option>
                    <option value="Keshav">Keshav</option>
                    <option value="Alfred">Alfred</option>
                    <option value="SOC Team">SOC Team</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Target Design Goal:</label>
                  <select
                    value={newTargetGoal}
                    onChange={(e) => setNewTargetGoal(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 text-xs"
                  >
                    <option value="Goal 1: Unified View">Goal 1: Unified View</option>
                    <option value="Goal 2: AI Detection + Human Control">Goal 2: AI Detection + Human Control</option>
                    <option value="Goal 3: Smarter Alert Prioritization">Goal 3: Smarter Alert Prioritization</option>
                    <option value="Goal 4: Early Pre-Incident Warning">Goal 4: Early Pre-Incident Warning</option>
                    <option value="Goal 5: False Positive Reduction">Goal 5: False Positive Reduction</option>
                    <option value="Goal 6: Real-Time Detection">Goal 6: Real-Time Detection</option>
                    <option value="Goal 7: Real-Time Insider Threats">Goal 7: Real-Time Insider Threats</option>
                    <option value="Goal 8: Automatic Anomaly Identification">Goal 8: Automatic Anomaly Identification</option>
                    <option value="Goal 9: Reactive to Proactive Shift">Goal 9: Reactive to Proactive Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Theme:</label>
                <input
                  type="text"
                  required
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  placeholder="e.g. Real-Time Telemetry, Noise Reduction"
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Architecture Solution Idea:
                </label>
                <textarea
                  rows={2}
                  value={newSolutionSummary}
                  onChange={(e) => setNewSolutionSummary(e.target.value)}
                  placeholder="Describe how the architecture solves this challenge..."
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition"
                >
                  Post to HMW Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
