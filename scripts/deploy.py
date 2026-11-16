#!/usr/bin/env python3
"""Deploie Verity sur AWS (CloudFormation). Identifiants via l'environnement (jamais ecrits).

  python3 scripts/deploy.py [--stack verity-jcx202-demo] [--cdn] [--delete [--purge-bucket]]
"""
import argparse, hashlib, json, os, sys, time, zipfile
import boto3
from botocore.exceptions import ClientError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "artifacts")
DATA = ("assets_universe.csv", "prices_daily.csv", "fx_usdcad_daily.csv", "sources_metadata.csv")
TAGS = [{"Key": "Owner", "Value": "jc-x202"}, {"Key": "Ticket", "Value": "BOILERROOM-20"}, {"Key": "Expires", "Value": "2026-11-16"}]
SKIP = {"__pycache__", ".DS_Store"}
REGION = "us-east-1"

BOOT = """AWSTemplateFormatVersion: "2010-09-09"
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub verity-${AWS::AccountId}-artifacts
      PublicAccessBlockConfiguration: {BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true}
      BucketEncryption: {ServerSideEncryptionConfiguration: [{ServerSideEncryptionByDefault: {SSEAlgorithm: AES256}}]}
      LifecycleConfiguration: {Rules: [{Status: Enabled, ExpirationInDays: 14}]}
Outputs:
  Name: {Value: !Ref Bucket}
"""


def build_zip():
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "verity.zip")
    files = [("app.py", os.path.join(ROOT, "app.py"))]
    for sub, keep in (("verity", None), ("web", None), ("data", DATA)):
        for dp, dn, fn in os.walk(os.path.join(ROOT, sub)):
            dn[:] = sorted(d for d in dn if d not in SKIP)
            for f in sorted(fn):
                if f in SKIP or f.endswith((".pyc", ".map", ".md")) or (keep and f not in keep):
                    continue
                full = os.path.join(dp, f)
                files.append((os.path.relpath(full, ROOT), full))
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for arc, full in files:  # horodatage fixe -> zip reproductible
            zi = zipfile.ZipInfo(arc, (2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16
            z.writestr(zi, open(full, "rb").read())
    h = hashlib.sha256(open(path, "rb").read()).hexdigest()
    return path, h, len(files)


def wait(cf, stack, ok):
    last = None
    while True:
        s = cf.describe_stacks(StackName=stack)["Stacks"][0]
        st = s["StackStatus"]
        if st != last:
            print(f"  {stack}: {st}", flush=True); last = st
        if st.endswith("_COMPLETE") and not st.endswith("IN_PROGRESS"):
            if st not in ok:
                ev = cf.describe_stack_events(StackName=stack)["StackEvents"]
                bad = [f"{e['LogicalResourceId']}: {e.get('ResourceStatusReason')}" for e in ev if "FAILED" in e["ResourceStatus"]][:4]
                sys.exit(f"echec {st}: {bad}")
            return s
        if st.endswith("_FAILED"):
            sys.exit(f"echec {st}")
        time.sleep(5)


def upsert(cf, stack, body, params, tags=TAGS):
    kw = dict(StackName=stack, TemplateBody=body, Parameters=params, Capabilities=["CAPABILITY_IAM"], Tags=tags)
    try:
        cf.describe_stacks(StackName=stack)
        exists = True
    except ClientError:
        exists = False
    try:
        (cf.update_stack if exists else cf.create_stack)(**kw)
    except ClientError as e:
        if "No updates are to be performed" in str(e):
            print("  aucune modification de pile")
            return cf.describe_stacks(StackName=stack)["Stacks"][0]
        raise
    return wait(cf, stack, {"CREATE_COMPLETE", "UPDATE_COMPLETE"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stack", default=os.environ.get("STACK_NAME", "verity-jcx202-demo"))
    ap.add_argument("--cdn", action="store_true", help="ajoute CloudFront")
    ap.add_argument("--delete", action="store_true")
    ap.add_argument("--purge-bucket", action="store_true", help="avec --delete : supprime aussi le bucket d'artefacts")
    a = ap.parse_args()
    if not a.stack.startswith("verity-"):
        sys.exit("la pile doit commencer par verity-")
    cf = boto3.client("cloudformation", region_name=REGION)
    acct = boto3.client("sts", region_name=REGION).get_caller_identity()["Account"]
    boot = "verity-artifacts"

    if a.delete:
        cf.delete_stack(StackName=a.stack)
        print("suppression", a.stack)
        cf.get_waiter("stack_delete_complete").wait(StackName=a.stack, WaiterConfig={"Delay": 5, "MaxAttempts": 240})
        if a.purge_bucket:
            s3 = boto3.resource("s3", region_name=REGION)
            s3.Bucket(f"verity-{acct}-artifacts").objects.all().delete()
            cf.delete_stack(StackName=boot)
        print("supprime")
        return

    path, sha, n = build_zip()
    print(f"zip: {n} fichiers, {os.path.getsize(path)/1e6:.2f} Mo, sha256 {sha[:12]}")
    # CloudFormation exige le code dans S3 (inline <= 4 Ko) : bucket prive via une pile d'amorcage partagee
    print("pile d'amorcage", boot)
    out = upsert(cf, boot, BOOT, [])
    bucket = f"verity-{acct}-artifacts"
    key = f"{a.stack}/verity-{sha[:16]}.zip"
    boto3.client("s3", region_name=REGION).upload_file(path, bucket, key)
    params = [{"ParameterKey": "CodeBucket", "ParameterValue": bucket}, {"ParameterKey": "CodeKey", "ParameterValue": key},
              {"ParameterKey": "EnableCloudFront", "ParameterValue": "true" if a.cdn else "false"}]
    for k, env in (("Model", "VERITY_MODEL"), ("FastModel", "VERITY_FAST_MODEL")):
        if os.environ.get(env):
            params.append({"ParameterKey": k, "ParameterValue": os.environ[env]})
    print("pile", a.stack)
    s = upsert(cf, a.stack, open(os.path.join(ROOT, "infra", "template.yaml")).read(), params)
    o = {x["OutputKey"]: x["OutputValue"] for x in s.get("Outputs", [])}
    info = {"stack": a.stack, "region": REGION, "account": acct, "api_url": o.get("ApiUrl"), "cloudfront_url": o.get("CloudFrontUrl"),
            "function": o.get("FunctionName"), "zip_sha256": sha, "deployed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    with open(os.path.join(OUT, "deployment.json" if a.stack == "verity-jcx202-demo" else f"deployment-{a.stack}.json"), "w") as f:
        json.dump(info, f, indent=2)
    print("URL API:", info["api_url"])
    if info["cloudfront_url"]:
        print("URL CloudFront:", info["cloudfront_url"])


if __name__ == "__main__":
    main()
