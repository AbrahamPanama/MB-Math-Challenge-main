'use client';

import { Award, Flame, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProgressChart } from '@/components/dashboard/progress-chart';
import { mockUserProgress } from '@/lib/data';
import { useLanguage } from '@/context/language-context';

export default function ProgressPage() {
  const { t } = useLanguage();

  const stats = [
    {
      title: t('progress.currentStreak'),
      value: `${mockUserProgress.streak} ${t('progress.days')}`,
      icon: Flame,
      color: 'text-accent',
    },
    {
      title: t('progress.totalXP'),
      value: mockUserProgress.xp.toLocaleString(),
      icon: Sparkles,
      color: 'text-primary',
    },
    {
      title: t('progress.skillsMastered'),
      value: mockUserProgress.skillsMastered,
      icon: Award,
      color: 'text-green-500',
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 text-muted-foreground ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>{t('progress.weeklyXP')}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ProgressChart data={mockUserProgress.weeklyProgress} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
