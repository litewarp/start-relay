/**
 * @generated SignedSource<<4965d91755c70cb5866dc8a6ad36b7e9>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type relayFastFragment$data = {
  readonly fastField: string;
  readonly " $fragmentType": "relayFastFragment";
};
export type relayFastFragment$key = {
  readonly " $data"?: relayFastFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"relayFastFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "relayFastFragment",
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

(node as any).hash = "7bc4951d12c8aa8171413c4909596d7a";

export default node;
