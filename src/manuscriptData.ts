#!/usr/bin/env node

import axios from 'axios';

const [
  id,
  preprint,
  date,
  evaluationSummary,
  peerReview,
  authorResponse,
  evaluationSummaryParticipants,
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
      date: new Date(date),
    })));
};

const hypothesis = async (id: string) => {
  return axios.get<{
    created: string,
    uri: string,
  }>(`https://api.hypothes.is/api/annotations/${id}`)
    .then((response) => ({
      preprint: response.data.uri.split('/').slice(-2).join('/'),
      date: new Date(response.data.created),
    }));
};

const gatherPreprints = (preprints: string[], dates: Date[], specificPreprints: string[]) => {
  // Use a Set to remove duplicates
  const uniquePreprints = Array.from(new Set(preprints));
  const uniqueSpecificPreprints = Array.from(new Set(specificPreprints));

  // Sort the preprints based on the numeric part
  uniquePreprints.sort((a, b) => {
    const matchA = a.match(/.+v([0-9]+)$/);
    const matchB = b.match(/.+v([0-9]+)$/);

    if (!matchA || !matchB) {
      throw new Error('Invalid preprint format');
    }

    const versionA = parseInt(matchA[1], 10);
    const versionB = parseInt(matchB[1], 10);

    return versionA - versionB;
  });
  
  uniqueSpecificPreprints.sort((a, b) => parseInt(a) - parseInt(b));
  
  if (uniquePreprints.length < uniqueSpecificPreprints.length) {
    const [doi] = uniquePreprints[uniquePreprints.length - 1].split('v');
    for (let i = uniquePreprints.length; i < uniqueSpecificPreprints.length; i++) {
      uniquePreprints.push(`${doi}v${uniqueSpecificPreprints[i]}`);
    }
  }

  return uniquePreprints.map((versionedDoi, i) => {
    const [doi, versionIdentifier] = versionedDoi.split('v');
    return {
      versionedDoi: uniqueSpecificPreprints.length > i ? `${doi}v${uniqueSpecificPreprints[i]}` : versionedDoi,
      doi,
      versionIdentifier: uniqueSpecificPreprints.length > i ? uniqueSpecificPreprints[i] : versionIdentifier,
      date: (dates.length > i) ? dates[i] : dates[dates.length - 1],
    };
  });
};

const formatDate = (date: Date) => date.toISOString();
const evaluationUrl = (id: string) => `https://sciety.org/evaluations/hypothesis:${id}/content`;

if (!id) {
  console.error('Error: Please provide an ID as an argument.');
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

const prepareManuscriptStructure = async (
  id: string,
  versionedDois: string[],
  preprints: string[],
  dates: Date[],
  evaluationSummary: string,
  evaluationSummaryDate: Date,
  evaluationSummaryParticipants: string[],
  peerReview?: string,
  peerReviewDate?: Date,
  authorResponse?: string,
  authorResponseDate?: Date
)=> {
  const gatheredPreprints = gatherPreprints(versionedDois, dates, preprints);
  const [preprintNotRevised] = gatheredPreprints;

  const evaluation = (reviewType: string, date: Date, participants: string[], contentUrl: string) => ({
    reviewType,
    date: formatDate(date),
    participants: participants.map((name) => ({
      name,
      role: 'curator',
    })),
    contentUrls: [
      contentUrl,
    ],
  });
  
  const version = async (
    id: string,
    versionedDoi: string,
    date: Date,
    versionIdentifier: string,
    evaluationSummary: string,
    evaluationSummaryDate: Date,
    evaluationSummaryParticipants: string[],
    peerReview?: string,
    peerReviewDate?: Date,
    authorResponse?: string,
    authorResponseDate?: Date
  ) => {
    const [doi, preprintVersionIdentifier] = versionedDoi.split('v');
    const results = await bioxriv(versionedDoi);
    const content = results.map((result) => result.content);
    
    return {
      id,
      doi,
      publishedDate: formatDate(date),
      versionIdentifier,
      preprint: {
        id: doi,
        doi,
        ...(results.length > 0 ? { publishedDate: formatDate(results[0].date) } : {}),
        versionIdentifier: preprintVersionIdentifier,
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
    };
  };

  return {
    id,
    manuscript: {
      doi: preprintNotRevised.doi,
      publishedDate: formatDate(preprintNotRevised.date),
    },
    versions: await Promise.all(gatheredPreprints.map(async (preprint, i) => version(
      id,
      preprint.versionedDoi,
      preprint.date,
      (i + 1).toString(),
      evaluationSummary,
      evaluationSummaryDate,
      evaluationSummaryParticipants,
      peerReview,
      peerReviewDate,
      authorResponse,
      authorResponseDate,
    ))),
  };
};

const prepareManuscript = async (
  id: string,
  preprints: string[],
  dates: Date[],
  evaluationSummary: string,
  evaluationSummaryParticipants: string[],
  peerReview?: string,
  authorResponse?: string
) => {
  const hypothesisDefault = {
    preprint: null,
    date: null,
  };
  const { preprint: evaluationSummaryPreprint, date: evaluationSummaryDate } = await hypothesis(evaluationSummary);
  const { preprint: peerReviewPreprint, date: peerReviewDate } = peerReview ? await hypothesis(peerReview) : hypothesisDefault;
  const { preprint: authorResponsePreprint, date: authorResponseDate } = authorResponse ? await hypothesis(authorResponse) : hypothesisDefault;
  return prepareManuscriptStructure(
    id,
    [
      evaluationSummaryPreprint,
      peerReviewPreprint,
      authorResponsePreprint,
    ].filter((preprint) => preprint !== null),
    preprints,
    dates,
    evaluationSummary,
    evaluationSummaryDate,
    evaluationSummaryParticipants,
    peerReviewDate ? peerReview : undefined,
    peerReviewDate ?? undefined,
    authorResponseDate ? authorResponse : undefined,
    authorResponseDate ?? undefined
  );
};

prepareManuscript(
  id,
  preprint.split('|').filter((p) => p.length > 0),
  date.split('|').filter((d) => d.length > 0).map((d) => new Date(d)),
  evaluationSummary,
  (evaluationSummaryParticipants ?? 'anonymous').split(','),
  peerReview,
  authorResponse
)
  .then((manuscript) => JSON.stringify(manuscript, undefined, 2))
  .then((manuscript) => console.log(manuscript));
