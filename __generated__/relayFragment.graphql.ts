/**
 * @generated SignedSource<<7984f50a302fb5b5266d03a85fba2c70>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type relayFragment$data = {
  readonly slowField: string | null | undefined;
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
      "args": [
        {
          "kind": "Literal",
          "name": "waitFor",
          "value": 5000
        }
      ],
      "kind": "ScalarField",
      "name": "slowField",
      "storageKey": "slowField(waitFor:5000)"
    }
  ],
  "type": "Query",
  "abstractKey": null
};

(node as any).hash = "ce423a54088459e10cede93470c42ca8";

export default node;
