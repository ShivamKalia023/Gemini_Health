const activeChallenges = [];
const upcomingChallenges = [{"id":3,"title":"abcd","description":"abcd","activityType":"Run","goalType":"Time","targetValue":10.0,"unit":"Km","startDate":"2026-09-11T12:00:00","endDate":"2026-09-15T12:00:00","registrationStartDate":"2026-09-06T12:00:00","registrationEndDate":"2026-09-10T12:00:00","status":"Scheduled","createdBy":null,"bannerImage":"https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFubmVyJTIwcnVubmluZ3xlbnwwfHwwfHx8MA%3D%3D","isPublic":true,"participants":[],"createdAt":"2026-08-06T11:57:51.196467","participantCount":0}];

try {
        const allChallenges = [
            ...activeChallenges.map(c => ({ ...c, uiStatus: 'active' })),
            ...upcomingChallenges.map(c => ({ ...c, uiStatus: 'upcoming' }))
        ];

        // Sort by start date (closest first)
        allChallenges.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        allChallenges.forEach(challenge => {
            let badgeClass = '';
            let badgeText = '';

            if (challenge.uiStatus === 'active') {
                badgeClass = 'badge-active';
                badgeText = 'Active';
            } else if (challenge.uiStatus === 'upcoming') {
                badgeClass = 'badge-upcoming';
                badgeText = 'Upcoming';
            } else {
                badgeClass = 'badge-completed';
                badgeText = 'Completed';
            }

            const participantCount = challenge.participants ? challenge.participants.length : 0;
            const goalText = `${challenge.targetValue} ${challenge.unit}`;
            
            // Map activity type to emoji
            let emoji = '🏃';
            const cat = challenge.activityType ? challenge.activityType.toUpperCase() : 'RUN';
            if (cat.includes('RIDE') || cat.includes('CYCL')) emoji = '🚴';
            else if (cat.includes('SWIM')) emoji = '🏊';
            else if (cat.includes('WALK')) emoji = '🚶';
            else if (cat.includes('HIKE')) emoji = '🥾';
            else if (cat.includes('GYM')) emoji = '🏋️';

            console.log("Success:", cat, emoji);
        });
} catch (e) {
    console.error(e);
}
