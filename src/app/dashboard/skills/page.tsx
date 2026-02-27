'use client';

import { Star, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { mockSkills } from '@/lib/data';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';

function MasteryStars({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < count ? 'text-primary fill-primary' : 'text-muted-foreground/50'
          }`}
        />
      ))}
    </div>
  );
}

export default function SkillsPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockSkills.map((skill) => (
            <Card key={skill.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-headline text-xl">{t(skill.nameKey)}</CardTitle>
                  <MasteryStars count={skill.mastery.stars} />
                </div>
                <CardDescription>{t(skill.descriptionKey)}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <Progress value={skill.mastery.progress} />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('skills.mastered', { progress: skill.mastery.progress })}
                </p>
              </CardContent>
              <CardFooter>
                 <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href={`/practice/${skill.id}`}>
                    {t('skills.practiceNow')} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
