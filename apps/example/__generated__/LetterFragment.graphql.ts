/**
 * @generated SignedSource<<2be4b76eb17b30c48c8ec613ecbd8a08>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import type { ReaderFragment } from 'relay-runtime';
import type { FragmentRefs } from "relay-runtime";
export type LetterFragment$data = {
  readonly node: {
    readonly id: string;
    readonly letter: string | null | undefined;
  };
  readonly " $fragmentType": "LetterFragment";
};
export type LetterFragment$key = {
  readonly " $data"?: LetterFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"LetterFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "LetterFragment",
  "selections": [
    {
      "kind": "RequiredField",
      "field": {
        "alias": null,
        "args": null,
        "concreteType": "Alphabet",
        "kind": "LinkedField",
        "name": "node",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "letter",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      "action": "THROW"
    }
  ],
  "type": "AlphabetEdge",
  "abstractKey": null
};

(node as any).hash = "9aaeb6e14e018ff959d6d4857daafb9e";

export default node;
