import { NextApiRequest, NextApiResponse } from 'next';

import { Document } from '@prismicio/client/types/documents';

import { getPrismicClient } from '../../services/prismic';

function linkResolver(document: Document): string {
  if (document.type === 'posts') {
    return `/post/${document.uid}`;
  }

  return '/';
}

export default async (
  request: NextApiRequest,
  response: NextApiResponse
): Promise<void> => {
  const { documentId, token } = request.query;

  const redirectUrl = await getPrismicClient({ req: request })
    .getPreviewResolver(String(token), String(documentId))
    .resolve(linkResolver, '/');

  if (!redirectUrl) {
    return response.status(401).json({ message: 'Invalid token' });
  }

  response.setPreviewData({ ref: token });
  response.writeHead(302, { Location: `${redirectUrl}` });

  return response.end();
};
