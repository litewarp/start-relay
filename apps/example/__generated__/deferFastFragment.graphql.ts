/**
 * @generated SignedSource<<95fba18313617885e5195f2af09ae249>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type deferFastFragment$data = {
  readonly fastField: string;
  readonly " $fragmentType": "deferFastFragment";
};
export type deferFastFragment$key = {
  readonly " $data"?: deferFastFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"deferFastFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "deferFastFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "fastField",
      "storageKey": null
    }
  ],
  "type": "Query",
  "abstractKey": null
};

(node as any).hash = "617eeabbd09370f71d0a538ba8d81694";

export default node;
