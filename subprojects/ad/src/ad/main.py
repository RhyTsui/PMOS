import uvicorn


def main() -> None:
    uvicorn.run("ad.app:app", host="127.0.0.1", port=8021, reload=True)


if __name__ == "__main__":
    main()
