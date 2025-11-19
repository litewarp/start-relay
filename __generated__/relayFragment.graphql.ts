/**
 * @generated SignedSource<<a7a1f20728d114b52805165b0b6e10bb>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type relayFragment$data = {
  readonly slowField: string;
  readonly " $fragmentType": "relayFragment";
};
export type relayFragment$key = {
  readonly " $data"?: relayFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"relayFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "relayFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "slowField",
      "storageKey": null
    }
  ],
  "type": "Query",
  "abstractKey": null
};

(node as any).hash = "16a1c93eb733845d7e2a8e9ad00f058c";

export default node;
