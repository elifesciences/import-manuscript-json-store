#!/usr/bin/env node

import axios from 'axios';

const [
  id,
  versionedDoi,
  date,
  evaluationSummary,
  evaluationSummaryDate,
  evaluationSummaryParticipants,
  peerReview,
  peerReviewDate,
  authorResponse,
  authorResponseDate,
] = process.argv.slice(2);

const bioxriv = async (versionedDoi: string) => {
  return axios.get<{
    results?: {
      filedate: string,
      tdm_path: string,
    }[],
  }>(`https://api.biorxiv.org/meca_index_v2/${versionedDoi}`)
    .then((response) => response.data.results ?? [])
    .then((results) => results.map(({tdm_path: content, filedate: date}) => ({
      content,
      date,
    })));
};

const formatDate = (date: Date) => date.toISOString();
const evaluationUrl = (id: string) => `https://sciety.org/evaluations/hypothesis:${id}/content`;

if (!id) {
  console.error('Error: Please provide an ID as an argument.');
  process.exit(1);
}

if (!versionedDoi) {
  console.error('Error: Please provide a versioned doi as an argument.');
  process.exit(1);
}

if (!date) {
  console.error('Error: Please provide a publish date as an argument.');
  process.exit(1);
}

if (!evaluationSummary) {
  console.error('Error: Please provide an evaluation summary as an argument.');
  process.exit(1);
}

if (!evaluationSummaryDate) {
  console.error('Error: Please provide an evaluation summary date as an argument.');
  process.exit(1);
}

const prepareManuscript = async (
  id: string,
  versionedDoi: string,
  date: Date,
  evaluationSummary: string,
  evaluationSummaryDate: Date,
  evaluationSummaryParticipants: string[],
  peerReview?: string,
  peerReviewDate?: Date,
  authorResponse?: string,
  authorResponseDate?: Date
)=> {
  const [doi, versionIdentifier] = versionedDoi.split('v');
  const results = await bioxriv(versionedDoi);
  const content = results.map((result) => result.content);
  
  const evaluation = (reviewType: string, date: Date, participants: string[], contentUrl: string) => ({
    reviewType,
    date: date.toISOString(),
    participants: participants.map((name) => ({
      name,
      role: 'curator',
    })),
    contentUrls: [
      contentUrl,
    ],
  });

  const manuscript = {
    id,
    manuscript: {
      doi,
      publishedDate: formatDate(date),
    },
    versions: [
      {
        id,
        doi,
        publishedDate: formatDate(date),
        versionIdentifier: '1',
        preprint: {
          id: doi,
          doi,
          ...(results.length > 0 ? { publishedDate: formatDate(date) } : {}),
          versionIdentifier,
          content,
          url: `https://www.biorxiv.org/content/${versionedDoi}`,
        },
        license: 'http://creativecommons.org/licenses/by/4.0/',
        peerReview: {
          reviews: (peerReview && peerReviewDate) ? [evaluation('review-article', peerReviewDate, [], evaluationUrl(peerReview))] : [],
          evaluationSummary: evaluation('evaluation-summary', evaluationSummaryDate, evaluationSummaryParticipants, evaluationUrl(evaluationSummary)),
          ...(authorResponse && authorResponseDate ? { authorResponse: evaluation('author-response', authorResponseDate, [], evaluationUrl(authorResponse)) } : {}),
        },
        ...(peerReview && peerReviewDate ? { reviewedDate: peerReviewDate.toISOString() } : {}),
        content,
        ...(authorResponse && authorResponseDate ? { authorResponseDate: authorResponseDate.toISOString() } : {}),
      },
    ],
  };

  console.log(JSON.stringify(manuscript, undefined, 2));
};

prepareManuscript(
  id,
  versionedDoi,
  new Date(date),
  evaluationSummary,
  new Date(evaluationSummaryDate),
  (evaluationSummaryParticipants ?? 'anonymous').split(','),
  peerReview,
  new Date(peerReviewDate),
  authorResponse,
  new Date(authorResponseDate)
);
