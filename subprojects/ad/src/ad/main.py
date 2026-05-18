import uvicorn


def main() -> None:
    uvicorn.run("ad.app:app", host="0.0.0.0", port=8021, reload=True)


if __name__ == "__main__":
    main()
