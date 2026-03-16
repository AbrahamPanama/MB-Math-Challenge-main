'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getActiveSave, getActiveUserProfile, getSkillSummaries } from '@/lib/saveManager';
import { practiceModes } from '@/lib/data';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/context/language-context';
import type { SaveSlot, Skill } from '@/lib/types';

export default function DashboardPage() {
  const { t } = useLanguage();
  const [save, setSave] = useState<SaveSlot | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    const activeSave = getActiveSave();
    if (activeSave) {
      setSave(activeSave);
      setSkills(getSkillSummaries(activeSave));
    }
  }, []);

  const activeUser = getActiveUserProfile(save);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t('dashboard.welcome', { name: activeUser.name })}
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {practiceModes.map((mode) => (
            <Card key={mode.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-headline">
                  {t(mode.titleKey)}
                </CardTitle>
                <mode.icon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  {t(mode.descriptionKey)}
                </p>
              </CardContent>
              <div className="p-6 pt-0">
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <Link href={mode.href}>
                    {t('dashboard.start')} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl mb-4">
            {t('dashboard.continueLearning')}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {skills.slice(0, 2).map((skill) => (
              <Card key={skill.id} className="shadow-md">
                 <CardHeader>
                    <CardTitle className="text-lg">{t(skill.nameKey)}</CardTitle>
                    <CardDescription>{t('dashboard.progressHint', { progress: skill.mastery.progress })}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Progress value={skill.mastery.progress} className="h-3" />
                </CardContent>
                <div className="p-6 pt-2 flex justify-end">
                     <Button asChild variant="ghost">
                        <Link href="/practice">
                            {t('dashboard.practice')} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
