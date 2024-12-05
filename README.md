# import-manuscript-json-store

## Script

```shell
yarn --silent manuscript-data [ID] [PREPRINTS] [PUBLISHDATE] [EVALUATION_SUMMARY_ID] [PEER_REVIEW_ID] [AUTHOR_RESPONSE_ID]
```

Example:

```shell
yarn --silent manuscript-data 3847 "" 2022-11-17 TfCA6maDEe2zm3_n3MyxjA PWlFMsYAEeyoOMsYgfQZig _-EEYk8BEe2uqM_lWThi9Q > ./articles/3847.json
```

Example with preprints and multiple dates:

```shell
yarn --silent manuscript-data 15676 "1|2" "2021-09-08|2021-10-09" J2qSChC1EeyvHS8fi9T9oQ A2ZbGBCxEeyu-CsIpygfMQ Q9GJ9BC0EeyPVBtgAn5Yjw > ./articles/15676.json
```

All the raw data needed to generate the json in the articles folder is in `./scripts/manuscript_data.csv`.

Regenerate all examples:

```shell
./scripts/process_manuscripts.sh
```
