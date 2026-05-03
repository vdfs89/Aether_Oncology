.PHONY: install install-dev train test run clean lint format mlflow-ui setup-and-test docker-build docker-run

# Instala dependências de produção + ferramentas de desenvolvimento (ruff, pytest)
install:
	pip install --upgrade pip && pip install ".[dev]"

train:
	python -m src.train

test:
	pytest tests/ --cov=src

run:
	uvicorn src.main:app --reload --port 8000

clean:
	rm -rf models/*.pth models/*.joblib .pytest_cache .coverage htmlcov/

lint:
	ruff check src/ tests/
	ruff format src/ tests/ --check

format:
	ruff check --fix src/ tests/
	ruff format src/ tests/

mlflow-ui:
	mlflow ui --port 5000 --backend-store-uri mlruns/

# Comando completo para o avaliador rodar tudo em sequência
setup-and-test:
	make install
	make train
	make test
	make lint

# Docker
docker-build:
	docker build -t aether-oncology:latest .

docker-run:
	docker run --rm -p 8000:8000 --name aether-oncology-api aether-oncology:latest
