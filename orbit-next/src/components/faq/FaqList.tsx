"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Faq } from "@shared/schema";
import { FAQ_CATEGORIES } from "@/shared/faq";
import { apiRequest } from "@/lib/queryClient";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ThumbsDown, ThumbsUp } from "lucide-react";

const CATEGORY_OPTIONS = ["All", ...FAQ_CATEGORIES];

export default function FaqList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

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
      const res = await apiRequest("POST", `/api/faqs/${id}/feedback`, { helpful });
      return (await res.json()) as Faq;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Faq[]>(["faqs"], (old) => {
        if (!old) return [updated];
        return old.map((item) => (item.id === updated.id ? updated : item));
      });
    },
    onError: () => {
      toast({
        title: "Feedback failed",
        description: "We couldn't record your feedback. Please try again.",
        variant: "destructive",
      });
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
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading FAQs…
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
            className="pl-9"
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
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  <div className="flex flex-col gap-1 text-left">
                    <span>{faq.question}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge variant="secondary">{faq.category}</Badge>
                      <span>Helpful: {faq.helpfulCount}</span>
                      <span>Not helpful: {faq.notHelpfulCount}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-3 text-sm leading-relaxed text-gray-700">
                    <p>{faq.answer}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-gray-500">Was this helpful?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={feedbackMutation.isPending}
                        onClick={() => feedbackMutation.mutate({ id: faq.id, helpful: true })}
                        className="flex items-center gap-2"
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
                        className="flex items-center gap-2"
                      >
                        {feedbackMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ThumbsDown className="h-4 w-4" />
                        )}
                        Not helpful
                      </Button>
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
