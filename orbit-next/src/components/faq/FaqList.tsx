"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Faq } from "@shared/schema";
import { FAQ_CATEGORIES } from "@/shared/faq";
import { apiRequest } from "@/lib/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkeletonListItem } from "@/components/ui/skeleton-presets";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/ui";
import { Loader2, Search, ThumbsDown, ThumbsUp } from "lucide-react";

const CATEGORY_OPTIONS = ["All", ...FAQ_CATEGORIES];
const VOTED_FAQS_KEY = "orbit:faq_votes";

export default function FaqList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [votedFaqs, setVotedFaqs] = useState<Set<string>>(new Set());

  // Load voted FAQs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VOTED_FAQS_KEY);
      if (stored) {
        setVotedFaqs(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  const { data: faqs = [], isLoading, isError, refetch, isFetching } = useQuery<Faq[]>({
    queryKey: ["faqs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/faqs");
      const payload = await res.json();
      return Array.isArray(payload?.data) ? payload.data : [];
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ id, helpful }: { id: string; helpful: boolean }) => {
      // Check if user has already voted on this FAQ
      if (votedFaqs.has(id)) {
        throw new Error("already_voted");
      }
      const res = await apiRequest("POST", `/api/faqs/${id}/feedback`, { helpful });
      return (await res.json()) as Faq;
    },
    onSuccess: (updated, variables) => {
      // Mark this FAQ as voted
      const newVotedFaqs = new Set(votedFaqs);
      newVotedFaqs.add(variables.id);
      setVotedFaqs(newVotedFaqs);
      
      // Save to localStorage
      try {
        localStorage.setItem(VOTED_FAQS_KEY, JSON.stringify(Array.from(newVotedFaqs)));
      } catch (e) {
        // Ignore storage errors
      }

      queryClient.setQueryData<Faq[]>(["faqs"], (old) => {
        if (!old) return [updated];
        return old.map((item) => (item.id === updated.id ? updated : item));
      });

      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded.",
      });
    },
    onError: (error: any) => {
      if (error?.message === "already_voted") {
        toast({
          title: "Already voted",
          description: "You've already submitted feedback for this FAQ.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Feedback failed",
          description: "We couldn't record your feedback. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        faq.question.toLowerCase().includes(normalizedSearch) ||
        faq.answer.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [faqs, searchTerm, selectedCategory]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 text-sm text-red-600">
        <p>We couldn't load the FAQs.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search FAQs"
            className="pl-9 focus:border-pink-600 focus:ring-pink-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((category) => {
            const isActive = category === selectedCategory;
            return (
              <Button
                key={category}
                type="button"
                size="sm"
                className={isActive ? "bg-pink-600 hover:bg-pink-700 text-white" : "border-pink-200 text-pink-600 hover:bg-pink-50"}
                variant={isActive ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {filteredFaqs.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No FAQs match your search.
          </div>
        ) : (
          <Accordion type="multiple" className="divide-y">
            {filteredFaqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="py-2">
                <AccordionTrigger className="text-left text-base font-semibold px-4 hover:no-underline">
                  <div className="flex flex-col gap-2 text-left">
                    <span>{faq.question}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge variant="outline" className="font-normal bg-pink-50 border-pink-200 text-pink-700">{faq.category}</Badge>
                      <span>Helpful: {faq.helpfulCount}</span>
                      <span>Not helpful: {faq.notHelpfulCount}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2 text-sm leading-relaxed text-gray-700">
                    <p>{faq.answer}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {votedFaqs.has(faq.id) ? (
                        <span className="text-xs text-pink-600 font-medium">✓ Thanks for your feedback!</span>
                      ) : (
                        <>
                          <span className="text-xs text-gray-500">Was this helpful?</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={feedbackMutation.isPending}
                            onClick={() => feedbackMutation.mutate({ id: faq.id, helpful: true })}
                            className="flex items-center gap-2 border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                          >
                            {feedbackMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ThumbsUp className="h-4 w-4" />
                            )}
                            Helpful
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={feedbackMutation.isPending}
                            onClick={() => feedbackMutation.mutate({ id: faq.id, helpful: false })}
                            className="flex items-center gap-2 border-pink-200 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
                          >
                            {feedbackMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ThumbsDown className="h-4 w-4" />
                            )}
                            Not helpful
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {isFetching && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
        </div>
      )}
    </div>
  );
}
